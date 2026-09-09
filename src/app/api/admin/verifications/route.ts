import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {createNotificationSafely} from '@/lib/notifications';
import {z} from 'zod';

const S=z.object({verificationId:z.string(),status:z.enum(['APPROVED','REJECTED','SUSPENDED']),reviewNote:z.string().max(1000).optional()});
const notificationCopy={
 APPROVED:{title:'Verification approved',body:'DriveDrop has approved your transporter verification. Your verified status is now active.'},
 REJECTED:{title:'Verification requires changes',body:'DriveDrop has reviewed your transporter verification and changes are required. Review the Admin note before updating your details or documents.'},
 SUSPENDED:{title:'Verification suspended',body:'DriveDrop has suspended your transporter verification.'}
} as const;

export async function GET(){
 const u=await currentUser();
 if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin access required'},{status:403});
 return NextResponse.json(await prisma.transporterVerification.findMany({include:{transporter:{select:{name:true,email:true,accountStatus:true,workRestricted:true}},documents:{orderBy:{createdAt:'desc'}}},orderBy:[{status:'asc'},{submittedAt:'desc'}]}));
}

export async function PATCH(r:Request){
 const u=await currentUser();
 if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin access required'},{status:403});
 const x=S.safeParse(await r.json());
 if(!x.success)return NextResponse.json({error:'Invalid review'},{status:400});
 const current=await prisma.transporterVerification.findUnique({where:{id:x.data.verificationId},include:{documents:{select:{type:true,status:true,expiresAt:true}}}});
 if(!current)return NextResponse.json({error:'Verification record not found'},{status:404});
 const now=new Date();
 const insuranceToday=new Date(now);insuranceToday.setUTCHours(0,0,0,0);
 if(x.data.status==='APPROVED'){
  const currentInsurance=current.documents.some(document=>document.type==='INSURANCE'&&['PENDING','APPROVED'].includes(document.status)&&document.expiresAt&&document.expiresAt>=insuranceToday);
  if(!currentInsurance)return NextResponse.json({error:'A current insurance document with a future expiry date is required before approval'},{status:400});
 }
 const updated=await prisma.$transaction(async(tx:any)=>{
  await tx.verificationDocument.updateMany({where:{verificationId:current.id,status:{not:'REJECTED'},expiresAt:{lt:insuranceToday}},data:{status:'EXPIRED',reviewerId:u.id,reviewedAt:now}});
  if(x.data.status==='APPROVED')await tx.verificationDocument.updateMany({where:{verificationId:current.id,status:'PENDING',OR:[{expiresAt:null},{expiresAt:{gte:insuranceToday}}]},data:{status:'APPROVED',reviewerId:u.id,reviewedAt:now,reviewNote:null}});
  if(x.data.status==='REJECTED')await tx.verificationDocument.updateMany({where:{verificationId:current.id,status:'PENDING'},data:{status:'REJECTED',reviewerId:u.id,reviewedAt:now,reviewNote:x.data.reviewNote}});
  return tx.transporterVerification.update({where:{id:current.id},data:{status:x.data.status,reviewNote:x.data.reviewNote,reviewedAt:now,reviewerId:u.id}});
 });
 if(current.status!==x.data.status){
  const copy=notificationCopy[x.data.status];
  await createNotificationSafely({userId:current.transporterId,type:'VERIFICATION',title:copy.title,body:copy.body});
 }
 return NextResponse.json(updated);
}
