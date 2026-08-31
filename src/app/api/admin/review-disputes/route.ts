import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {createNotificationSafely} from '@/lib/notifications';
import {z} from 'zod';

const S=z.object({reviewId:z.string(),action:z.enum(['KEEP','HIDE','REJECT']),note:z.string().min(1).max(1200)});

export async function GET(){
 const u=await currentUser();
 if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin access required'},{status:403});
 const rows=await prisma.$queryRaw<any[]>`
  SELECT r.id,r.rating,r.body,r.verified,r."createdAt",r."transporterResponse",r."moderationStatus",
         r."disputeReason",r."disputeDetails",r."disputedAt",r."moderationNote",r."moderatedAt",
         c.name AS "customerName",t.name AS "transporterName",j."vehicleMake",j."vehicleModel",
         j."vehicleType",j.registration,j.collection,j.delivery,j.running
  FROM "Review" r
  JOIN "User" c ON c.id=r."customerId"
  JOIN "User" t ON t.id=r."transporterId"
  JOIN "Booking" b ON b.id=r."bookingId"
  JOIN "TransportJob" j ON j.id=b."jobId"
  WHERE r."moderationStatus"='UNDER_REVIEW'
  ORDER BY r."disputedAt" ASC`;
 return NextResponse.json(rows,{headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function PATCH(req:Request){
 const u=await currentUser();
 if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin access required'},{status:403});
 const x=S.safeParse(await req.json());
 if(!x.success)return NextResponse.json({error:'Invalid moderation action'},{status:400});
 const review=await prisma.review.findUnique({where:{id:x.data.reviewId},include:{booking:{include:{job:true}},transporter:{select:{id:true}}}});
 if(!review)return NextResponse.json({error:'Review not found'},{status:404});
 const status=x.data.action==='HIDE'?'HIDDEN':x.data.action==='REJECT'?'DISPUTE_REJECTED':'VISIBLE';
 const changed=await prisma.$executeRaw`UPDATE "Review" SET "moderationStatus"=${status},"moderationNote"=${x.data.note},"moderatedAt"=NOW() WHERE id=${x.data.reviewId} AND "moderationStatus"='UNDER_REVIEW'`;
 if(!changed)return NextResponse.json({error:'Review dispute not found or already resolved'},{status:404});
 const vehicle=`${review.booking.job.vehicleMake} ${review.booking.job.vehicleModel}`.trim()||'vehicle';
 const outcome=x.data.action==='HIDE'?'DriveDrop has hidden this review from your public rating.':x.data.action==='REJECT'?'DriveDrop has rejected your review dispute and the review remains visible.':'DriveDrop has kept the review visible after moderation.';
 await createNotificationSafely({userId:review.transporter.id,type:'REVIEW',title:'Review moderation completed',body:`${vehicle}: ${outcome} DriveDrop note: ${x.data.note}`,href:'/transporter/reviews'});
 return NextResponse.json({ok:true,status});
}
