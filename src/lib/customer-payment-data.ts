import {prisma} from './prisma';
import type {CustomerPayment} from './customer-payments';

// Scope the query itself, including individual receipt downloads, to the customer.
export async function customerPayments(customerId:string,bookingId?:string):Promise<CustomerPayment[]> {
  const payments=await prisma.bookingPayment.findMany({
    where:{currency:'GBP',booking:{customerId,...(bookingId?{id:bookingId}:{})}},
    select:{id:true,bookingId:true,currency:true,transportValuePence:true,paidPence:true,refundedPence:true,status:true,provider:true,createdAt:true,
      events:{where:{type:'PAYMENT_CAPTURED'},select:{createdAt:true},orderBy:{createdAt:'desc'},take:1},
      booking:{select:{status:true,customerConfirmedAt:true,job:{select:{vehicleMake:true,vehicleModel:true,collection:true,delivery:true}}}}},
    orderBy:{createdAt:'desc'}
  });
  return payments.map(p=>({id:p.id,bookingId:p.bookingId,reference:'DD-'+p.bookingId.slice(-8).toUpperCase(),vehicle:[p.booking.job.vehicleMake,p.booking.job.vehicleModel].filter(Boolean).join(' '),collection:p.booking.job.collection,delivery:p.booking.job.delivery,bookingStatus:p.booking.status,confirmed:!!p.booking.customerConfirmedAt,currency:p.currency,totalPence:p.transportValuePence,paidPence:p.paidPence,refundedPence:p.refundedPence,status:p.status,createdAt:p.createdAt.toISOString(),paidAt:p.events[0]?.createdAt.toISOString()||null,test:p.provider.toUpperCase()==='TEST'})).sort((a,b)=>(b.paidAt||b.createdAt).localeCompare(a.paidAt||a.createdAt));
}
