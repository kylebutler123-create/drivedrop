import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';

const Action=z.discriminatedUnion('action',[
  z.object({action:z.literal('RESPOND'),reviewId:z.string(),response:z.string().min(1).max(1200)}),
  z.object({action:z.literal('DISPUTE'),reviewId:z.string(),reason:z.string().min(3).max(160),details:z.string().max(2000).optional()})
]);

export async function GET(){
 const u=await currentUser();
 if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
 const rows=await prisma.$queryRaw<any[]>`
  SELECT r.id,r."bookingId",r.rating,r.body,r.verified,r."createdAt",
         r."transporterResponse",r."transporterRespondedAt",r."moderationStatus",
         r."disputeReason",r."disputeDetails",r."disputedAt",r."moderationNote",r."moderatedAt",
         c.name AS "customerName",j."vehicleMake",j."vehicleModel"
  FROM "Review" r
  JOIN "User" c ON c.id=r."customerId"
  JOIN "Booking" b ON b.id=r."bookingId"
  JOIN "TransportJob" j ON j.id=b."jobId"
  WHERE r."transporterId"=${u.id}
  ORDER BY r."createdAt" DESC`;
 return NextResponse.json(rows,{headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function PATCH(req:Request){
 const u=await currentUser();
 if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
 const parsed=Action.safeParse(await req.json());
 if(!parsed.success)return NextResponse.json({error:'Invalid review action'},{status:400});
 const x=parsed.data;
 const owned=await prisma.review.findFirst({where:{id:x.reviewId,transporterId:u.id},select:{id:true}});
 if(!owned)return NextResponse.json({error:'Review not found'},{status:404});
 if(x.action==='RESPOND'){
  await prisma.$executeRaw`UPDATE "Review" SET "transporterResponse"=${x.response},"transporterRespondedAt"=NOW() WHERE id=${x.reviewId} AND "transporterId"=${u.id}`;
  return NextResponse.json({ok:true});
 }
 const current=await prisma.$queryRaw<any[]>`SELECT "moderationStatus" FROM "Review" WHERE id=${x.reviewId} AND "transporterId"=${u.id} LIMIT 1`;
 if(current[0]?.moderationStatus==='UNDER_REVIEW')return NextResponse.json({error:'This review is already under DriveDrop review'},{status:409});
 await prisma.$executeRaw`UPDATE "Review" SET "moderationStatus"='UNDER_REVIEW',"disputeReason"=${x.reason},"disputeDetails"=${x.details||null},"disputedAt"=NOW(),"moderationNote"=NULL,"moderatedAt"=NULL WHERE id=${x.reviewId} AND "transporterId"=${u.id}`;
 return NextResponse.json({ok:true});
}
