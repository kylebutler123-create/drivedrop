import {currentUser} from '@/lib/auth';
import {customerPayments} from '@/lib/customer-payment-data';
import {filterPayments,paymentCsv,paymentLabel,paymentStatuses} from '@/lib/customer-payments';
import {paymentPdf} from '@/lib/payment-pdf';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const privateHeaders={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
 const user=await currentUser();
 if(!user)return Response.json({error:'Please sign in.'},{status:401,headers:privateHeaders});
 if(user.role!=='CUSTOMER')return Response.json({error:'Customer access required.'},{status:403,headers:privateHeaders});
 const params=new URL(request.url).searchParams;
 const format=params.get('format')||'pdf',bookingId=params.get('bookingId')||undefined;
 const q=params.get('q')||'',month=params.get('month')||'',status=params.get('status')||'';
 if(!['pdf','csv'].includes(format)||(bookingId&&(!/^[a-zA-Z0-9_-]{1,100}$/.test(bookingId)||format!=='pdf'))||q.length>300||(month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))||(status&&!paymentStatuses.includes(status)))return Response.json({error:'Invalid download filters.'},{status:400,headers:privateHeaders});
 try{
  const records=await customerPayments(user.id,bookingId);
  if(bookingId&&(!records.length||records[0].paidPence<=0))return Response.json({error:'Receipt not found.'},{status:404,headers:privateHeaders});
  const rows=bookingId?records:filterPayments(records,{q,month,status});
  const name=bookingId?`DriveDrop-receipt-${rows[0].reference}.pdf`:`DriveDrop-payment-statement.${format}`;
  const headers={...privateHeaders,'Content-Disposition':`attachment; filename="${name}"`,'Content-Type':format==='pdf'?'application/pdf':'text/csv; charset=utf-8'};
  if(format==='csv')return new Response(paymentCsv(rows),{headers});
  const filters=bookingId?'Booking payment record':`Filters: ${month||'All dates'} / ${status?paymentLabel(status):'All statuses'}${q?' / Search: '+q:''}`;
  const bytes=await paymentPdf(rows,user.name,!!bookingId,filters);
  return new Response(new Uint8Array(bytes),{headers});
 }catch(error){console.error('Payment download failed',error instanceof Error?error.name:'Unknown error');return Response.json({error:'Unable to create your download. Please try again.'},{status:500,headers:privateHeaders});}
}
