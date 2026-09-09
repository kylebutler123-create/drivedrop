import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {createNotificationSafely} from '@/lib/notifications';
import {z} from 'zod';

const S=z.object({verificationId:z.string(),status:z.enum(['APPROVED','REJECTED','SUSPENDED']),reviewNote:z.string().max(1000).optional()});
const notificationCopy={
 APPROVED:{title:'Verification approved',body:'DriveDrop has approved your transporter verification. Your verified status is now active.'},
 REJECTED:{title:'Verification requires changes',body:'DriveDrop has reviewed your transporter verification and changes are required. Open Verification & Insurance to read the review note and update your details or documents.'},
 SUSPENDED:{title:'Verification suspended',body:'DriveDrop has suspended your transporter verification. Open Verification & Insurance to review your current status and the Admin review note.'}
} as const;

export async function GET(){
 const u=await currentUser();
 if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin access required'},{status:403});
 return NextResponse.json(await prisma.transporterVerification.findMany({include:{transporter:{select:{name:true,email:true,accountStatus:true,workRestricted:true}},documents:{orderBy:{createdAt:'asc'}}},orderBy:[{status:'asc'},{submittedAt:'desc'}]}));
}

export async function PATCH(r:Request){
 const u=await currentUser();
 if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin access required'},{status:403});
 const x=S.safeParse(await r.json());
 if(!x.success)return NextResponse.json({error:'Invalid review'},{status:400});
 const current=await prisma.transporterVerification.findUnique({where:{id:x.data.verificationId},select:{status:true,transporterId:true}});
 if(!current)return NextResponse.json({error:'Verification record not found'},{status:404});
 const updated=await prisma.transporterVerification.update({where:{id:x.data.verificationId},data:{status:x.data.status,reviewNote:x.data.reviewNote,reviewedAt:new Date(),reviewerId:u.id}});
 if(current.status!==x.data.status){
  const copy=notificationCopy[x.data.status];
  await createNotificationSafely({userId:current.transporterId,type:'VERIFICATION',title:copy.title,body:copy.body,href:'/transporter/verification'});
 }
 return NextResponse.json(updated);
}
