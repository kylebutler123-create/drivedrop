import {prisma} from './prisma';
import {createNotificationSafely} from './notifications';
import {sendTransactionalEmailSafely} from './email';
export async function notifyAvailability(id:string){
 const r=await prisma.availabilityRequest.findUnique({where:{id},include:{job:true}});if(!r||['AWAITING_AUTHORISATION','CAPTURING'].includes(r.status))return;
 const customer=r.status!=='AWAITING_TRANSPORTER'&&r.status!=='WITHDRAWN';
 const user=await prisma.user.findUnique({where:{id:customer?r.customerId:r.transporterId}});if(!user)return;
 const time=(d:Date)=>d.toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'});
 const title=({AWAITING_TRANSPORTER:'Payment authorised — please confirm availability',AWAITING_PAYMENT:'Earlier request — payment authorisation required',PAYMENT_FAILED:'Payment unsuccessful — booking not confirmed',BOOKED:'Payment secured — booking confirmed',DECLINED:'Transporter unavailable — choose another quote',WITHDRAWN:'Customer withdrew the confirmation request',EXPIRED:'Booking request expired'} as Record<string,string>)[r.status]||'Transport request updated';
 const body=`${r.job.vehicleMake} ${r.job.vehicleModel}: ${r.job.collection} → ${r.job.delivery}.\nCollection: ${time(r.collectionDate).split(',')[0]}${r.collectionFrom?`, ${r.collectionFrom}–${r.collectionUntil} UK time`:''}.\n`+(r.status==='AWAITING_TRANSPORTER'?`Payment is authorised. Confirm by ${time(r.respondBy)} UK time to collect payment and secure the booking. Declining or timing out carries no £50 fine.`:r.status==='AWAITING_PAYMENT'?`Pay by ${time(r.payBy!)} UK time. If the payment window expires, availability must be checked again.`:r.status==='BOOKED'?'Transporter confirmation and payment capture are complete.': 'No £50 cancellation fine applies. Your request and quote history are retained.');
 const href=customer?'/customer?view=quotes':'/transporter?view=quotes';
 await createNotificationSafely({userId:user.id,type:r.status==='BOOKED'?'BOOKING':'QUOTE',title,body,href:r.status==='BOOKED'?'/customer?view=bookings':href});
 await sendTransactionalEmailSafely({to:user.email,subject:`DriveDrop — ${title}`,heading:title,body,ctaLabel:'View request',ctaPath:href});
 if(r.status==='BOOKED'){
  await createNotificationSafely({userId:r.transporterId,type:'PAYMENT',title:'Customer payment secured',body:'The authorised customer payment was captured when you confirmed. Contact the customer to arrange collection within the agreed window.',href:'/transporter?view=deliveries'});
  const transporter=await prisma.user.findUnique({where:{id:r.transporterId}});
  if(transporter)await sendTransactionalEmailSafely({to:transporter.email,subject:'DriveDrop booking confirmed',heading:'Payment secured',body:'Your confirmed transport has been paid. Contact the customer to arrange collection within the agreed window.',ctaLabel:'View delivery',ctaPath:'/transporter?view=deliveries'});
 }
}
