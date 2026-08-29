import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/auth';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
 const u=await currentUser();
 if(!u||u.role!=='CUSTOMER')return NextResponse.json({error:'Forbidden'},{status:403,headers:{'Cache-Control':'no-store, max-age=0'}});
 const jobs=await prisma.transportJob.findMany({
  where:{customerId:u.id},
  include:{
   quotes:{include:{transporter:{select:{
    name:true,
    transporterVerification:{select:{status:true}},
    reviewsReceived:{where:{verified:true,moderationStatus:{not:'HIDDEN'}},select:{rating:true}}
   }}}},
   booking:true
  },
  orderBy:{createdAt:'desc'}
 });
 const result=jobs.map(job=>({...job,quotes:job.quotes.map(q=>{
  const ratings=q.transporter.reviewsReceived.map(r=>r.rating);
  const reviewCount=ratings.length;
  const averageRating=reviewCount?ratings.reduce((sum,r)=>sum+r,0)/reviewCount:null;
  const {reviewsReceived,...transporter}=q.transporter;
  const ratingText=averageRating!==null?`★ ${averageRating.toFixed(1)} (${reviewCount} review${reviewCount===1?'':'s'})`:'★ New transporter';
  const displayName=`${transporter.name} · ${ratingText}`;
  return {...q,transporter:{...transporter,name:displayName,personName:transporter.name,reviewCount,averageRating}};
 })}));
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store, max-age=0'}});
}
