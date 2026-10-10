import {after,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {apiError,parseJson} from '@/lib/api';
import {respondToRequest,reconcileRequest} from '@/lib/booking-authorisation';
import {lockJob,closeExpired} from '@/lib/availability';
import {paymentEnvironment} from '@/lib/booking-authorisation-provider';
import {notifyAvailability} from '@/lib/availability-notifications';
import {availabilityForAccount} from '@/lib/price-visibility';
export const dynamic='force-dynamic';
export async function GET(){try{
 const u=await currentUser();if(!u||!['CUSTOMER','TRANSPORTER'].includes(u.role))return NextResponse.json({error:'Login required'},{status:403});
 const owner=u.role==='CUSTOMER'?{customerId:u.id}:{transporterId:u.id};
 const pending=await prisma.availabilityRequest.findMany({where:{...owner,OR:[{activeJobId:{not:null}},{paymentState:'RELEASE_PENDING'}]},select:{id:true,jobId:true,status:true,paymentEnvironment:true},take:100});
 for(const row of pending){
  if(row.paymentEnvironment&&row.paymentEnvironment!==paymentEnvironment())continue;
  try{await prisma.$transaction(async tx=>{await lockJob(tx,row.jobId);await closeExpired(tx,row.jobId,new Date());});const next=await reconcileRequest(row.id);if(next.status!==row.status)after(()=>notifyAvailability(row.id));}catch{ /* Keep pending operations visible for retry/reconciliation. */ }
 }
 const rows=await prisma.availabilityRequest.findMany({where:{...owner,...(u.role==='TRANSPORTER'?{status:{not:'AWAITING_AUTHORISATION'}}:{})},include:{job:{select:{vehicleMake:true,vehicleModel:true,collection:true,delivery:true,running:true,status:true}}},orderBy:{createdAt:'desc'},take:100});
 const ids=[...new Set(rows.flatMap(r=>[r.customerId,r.transporterId]))];
 const users=await prisma.user.findMany({where:{id:{in:ids}},select:{id:true,name:true}});
 return NextResponse.json(rows.map(r=>availabilityForAccount({...r,customerName:users.find(u=>u.id===r.customerId)?.name,transporterName:users.find(u=>u.id===r.transporterId)?.name},u.role)),{headers:{'Cache-Control':'no-store'}});
}catch(e){return apiError(e,'Unable to load confirmation requests');}}
const S=z.object({requestId:z.string().min(1),action:z.enum(['CONFIRM','DECLINE','WITHDRAW'])});
export async function PATCH(r:Request){try{const u=await currentUser();if(!u)return NextResponse.json({error:'Login required'},{status:403});const d=await parseJson(r,S);const result=await respondToRequest(u,d.requestId,d.action);if(result.changed)after(()=>notifyAvailability(result.request.id));return NextResponse.json(availabilityForAccount(result.request,u.role));}catch(e){return apiError(e,'Unable to update confirmation request');}}
