import {prisma} from '@/lib/prisma';

export const quoteRequestExpiryDays=Number(process.env.DRIVEDROP_QUOTE_EXPIRY_DAYS||7);

export function quoteRequestExpiryCutoff(now=new Date()){
 return new Date(now.getTime()-quoteRequestExpiryDays*24*60*60*1000);
}

export async function deleteExpiredQuoteRequests(){
 const cutoff=quoteRequestExpiryCutoff();
 return prisma.$transaction(async tx=>{
  const stale=await tx.transportJob.findMany({
   where:{
    status:{in:['OPEN','QUOTED']},
    createdAt:{lt:cutoff},
    booking:null
   },
   select:{id:true}
  });
  const ids=stale.map(job=>job.id);
  if(!ids.length)return 0;
  await tx.quote.deleteMany({where:{jobId:{in:ids},booking:null}});
  const deleted=await tx.transportJob.deleteMany({
   where:{id:{in:ids},booking:null,status:{in:['OPEN','QUOTED']}}
  });
  return deleted.count;
 });
}
