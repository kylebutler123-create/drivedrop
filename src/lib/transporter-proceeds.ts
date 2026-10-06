import {prisma} from './prisma';

export type PeriodParams={year?:string;start?:string;end?:string};
export const londonDate=(value:Date|string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function proceedsPeriod(params:PeriodParams,now=new Date()){
 const currentYear=Number(londonDate(now).slice(0,4));
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 if(params.start||params.end){
  if(!params.start||!params.end||!valid(params.start)||!valid(params.end)||params.start>params.end)throw new Error('Choose a valid start and end date.');
  return {start:params.start,end:params.end,title:'Custom date range',year:null,currentYear};
 }
 const year=params.year===undefined?currentYear:Number(params.year);
 if(!Number.isInteger(year)||year<2000||year>currentYear)throw new Error('Choose a valid year.');
 return {start:year+'-01-01',end:year+'-12-31',title:String(year),year,currentYear};
}
export type ProceedsPeriod=ReturnType<typeof proceedsPeriod>;
export function inProceedsPeriod(row:{createdAt:Date|string},period:ProceedsPeriod){
 const day=londonDate(row.createdAt);return day>=period.start&&day<=period.end;
}
export const periodQuery=(period:ProceedsPeriod)=>period.year?new URLSearchParams({year:String(period.year)}):new URLSearchParams({start:period.start,end:period.end});
export const longDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'});
export const periodDescription=(period:ProceedsPeriod)=>longDate(period.start)+' – '+longDate(period.end);
export async function loadProceeds(transporterId:string){
 return prisma.booking.findMany({
  where:{transporterId,status:{in:['CONFIRMED','COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON','DELIVERED','CANCELLED']}},
  select:{
   id:true,status:true,customerConfirmedAt:true,createdAt:true,
   customer:{select:{name:true}},
   job:{select:{id:true,vehicleMake:true,vehicleModel:true,registration:true,collection:true,delivery:true,collectionDate:true}},
   payment:{select:{transporterProceedsPence:true,cancellationDeductionPence:true,refundedPence:true,payoutStatus:true,updatedAt:true,events:{where:{type:'PAYOUT_PAID'},select:{createdAt:true},orderBy:{createdAt:'desc'},take:1}}}
  },orderBy:{createdAt:'desc'}
 });
}
export type ProceedsBooking=Awaited<ReturnType<typeof loadProceeds>>[number];
export function proceedsCsv(rows:ProceedsBooking[]){
 const cell=(value:unknown)=>{
  let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
 };
 const header=['Booking ID','Delivery reference','Booked on (Europe/London)','Customer','Vehicle','Registration','Collection','Delivery','Collection date','Delivery status','Payout status','Proceeds before fines GBP','Fine deducted GBP','Net proceeds GBP','Customer refund GBP','Paid on (Europe/London)'];
 const records=rows.filter(r=>r.payment).map(r=>{
  const p=r.payment!;const net=p.payoutStatus==='CANCELLED'?0:p.transporterProceedsPence||0;
  const fine=p.cancellationDeductionPence||0;
  return [r.id,'DD-'+r.id.slice(-8).toUpperCase(),londonDate(r.createdAt),r.customer.name,[r.job.vehicleMake,r.job.vehicleModel].join(' '),r.job.registration,r.job.collection,r.job.delivery,r.job.collectionDate?londonDate(r.job.collectionDate):'',r.status,p.payoutStatus,((net+fine)/100).toFixed(2),(fine/100).toFixed(2),(net/100).toFixed(2),((p.refundedPence||0)/100).toFixed(2),p.events[0]?londonDate(p.events[0].createdAt):''];
 });
 return '\uFEFF'+[header,...records].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}

