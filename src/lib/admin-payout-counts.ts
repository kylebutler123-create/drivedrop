import {payoutAccountReadiness} from './stripe-connect-accounts';
import {prisma} from './prisma';
import {payoutWindowOpen} from './payout-policy';
export async function adminPayoutCounts(){
 const rows=await prisma.bookingPayment.findMany({where:{payoutStatus:'READY'},include:{events:{where:{type:'PAYOUT_READY'},select:{note:true}},booking:{select:{status:true,transporterId:true,customerConfirmedAt:true,disputes:{select:{id:true,status:true,resolution:true}}}}}});
 const eligible=rows.filter(p=>p.booking.status==='DELIVERED'&&payoutWindowOpen({...p.booking,payment:p},p.events));
 const ids=[...new Set(eligible.map(p=>p.booking.transporterId))];
 const details=ids.length?await prisma.$queryRawUnsafe<{userId:string}[]>(`SELECT "userId" FROM "TransporterPayoutDetails" WHERE "userId" IN (${ids.map((_,i)=>`$${i+1}`).join(',')})`,...ids):[];
 const stripeReady=await payoutAccountReadiness(ids);
 const complete=new Set(details.map(d=>d.userId));
 const isComplete=(p:typeof eligible[number])=>p.provider==='STRIPE'?!!stripeReady.get(p.booking.transporterId):complete.has(p.booking.transporterId);
 return {readyPayouts:eligible.filter(isComplete).length,blockedPayouts:eligible.filter(p=>!isComplete(p)).length};
}
