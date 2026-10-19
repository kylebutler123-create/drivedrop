import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {verifyStripeEvent} from '@/lib/booking-authorisation-provider';
import {reconcileRequest} from '@/lib/booking-authorisation';
import {notifyAvailability} from '@/lib/availability-notifications';
import {connectEnabled} from '@/lib/stripe-connect-provider';
import {handleConnectSnapshot} from '@/lib/stripe-connect-events';
export const runtime='nodejs';
export const maxDuration=180;
export async function POST(request:Request){
 let event;try{event=verifyStripeEvent(await request.text(),request.headers.get('stripe-signature'));}catch{return NextResponse.json({error:'Invalid webhook signature'},{status:400});}
 if(['transfer.created','transfer.updated','transfer.reversed'].includes(event.type)){
  if(!connectEnabled())return NextResponse.json({error:'Connect is disabled'},{status:503});
  try{await handleConnectSnapshot(event);return NextResponse.json({received:true});}catch{return NextResponse.json({error:'Transfer reconciliation pending'},{status:500});}
 }
 if(!['checkout.session.completed','checkout.session.expired','payment_intent.amount_capturable_updated','payment_intent.succeeded','payment_intent.payment_failed','payment_intent.canceled'].includes(event.type))return NextResponse.json({received:true});
 try{
  const id=event.data?.object?.metadata?.availabilityRequestId;
  if(typeof id!=='string')return NextResponse.json({received:true});
  const r=await prisma.availabilityRequest.findUnique({where:{id}});if(!r)return NextResponse.json({received:true});
  // Retrieve canonical Stripe state; duplicate/stale events cannot regress a booking.
  const next=await reconcileRequest(id);if(next.status!==r.status)await notifyAvailability(id);
  return NextResponse.json({received:true});
 }catch{return NextResponse.json({error:'Payment reconciliation pending'},{status:500});}
}
