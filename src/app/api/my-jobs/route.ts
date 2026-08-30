import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import {profileImageUrl} from '@/lib/supabase-storage';
import {calculateCustomerPrice} from '@/lib/finance';
import {quoteRequestExpiryCutoff} from '@/lib/job-expiry';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
 const u=await currentUser();
 if(!u||u.role!=='CUSTOMER')return NextResponse.json({error:'Forbidden'},{status:403,headers:{'Cache-Control':'no-store, max-age=0'}});
 const jobs=await prisma.transportJob.findMany({
  where:{customerId:u.id,status:{in:['OPEN','QUOTED']},createdAt:{gte:quoteRequestExpiryCutoff()}},
  include:{
   quotes:{include:{transporter:{select:{
    id:true,
    name:true,
    createdAt:true,
    transporterVerification:{select:{status:true,businessName:true,companyNumber:true,yearsOperating:true,website:true}},
    reviewsReceived:{where:{verified:true,moderationStatus:{not:'HIDDEN'}},select:{rating:true}}
   }}}},
   booking:true
  },
  orderBy:{createdAt:'desc'}
 });
 const transporterIds=[...new Set(jobs.flatMap(job=>job.quotes.map(q=>q.transporter.id)))];
 const profileRows=transporterIds.length?await prisma.$queryRawUnsafe<Array<{transporterId:string;profileImagePath:string|null}>>(`SELECT "transporterId", "profileImagePath" FROM "TransporterVerification" WHERE "transporterId" IN (${transporterIds.map((_,i)=>`$${i+1}`).join(',')})`,...transporterIds):[];
 const profilePaths=new Map(profileRows.map(row=>[row.transporterId,row.profileImagePath]));
 const result=jobs.map(job=>({...job,quotes:job.quotes.map(q=>{
  const ratings=q.transporter.reviewsReceived.map(r=>r.rating);
  const reviewCount=ratings.length;
  const averageRating=reviewCount?ratings.reduce((sum,r)=>sum+r,0)/reviewCount:null;
  const {reviewsReceived,...transporter}=q.transporter;
  const verification=transporter.transporterVerification;
  const ratingText=averageRating!==null?`★ ${averageRating.toFixed(1)} (${reviewCount} review${reviewCount===1?'':'s'})`:'★ New transporter';
  const businessName=verification?.businessName||transporter.name;
  const displayName=`${businessName} · ${ratingText}`;
  const pricing=calculateCustomerPrice(q.pricePence);
  return {...q,transporterBasePricePence:q.pricePence,platformFeePence:pricing.platformFeePence,pricePence:pricing.customerTotalPence,transporter:{...transporter,name:displayName,personName:transporter.name,businessName,companyNumber:verification?.companyNumber||null,yearsOperating:verification?.yearsOperating??null,website:verification?.website||null,verificationStatus:verification?.status||'NOT_STARTED',reviewCount,averageRating,profileImageUrl:profileImageUrl(profilePaths.get(transporter.id)||null)}};
 })}));
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store, max-age=0'}});
}
