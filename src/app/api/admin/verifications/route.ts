import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {createNotificationSafely} from '@/lib/notifications';
import {z} from 'zod';

const VerificationReview=z.object({verificationId:z.string(),status:z.enum(['APPROVED','REJECTED','SUSPENDED']),reviewNote:z.string().max(1000).optional()});
const DocumentReview=z.object({documentId:z.string(),documentStatus:z.enum(['APPROVED','REJECTED']),reviewNote:z.string().max(1000).optional()});
const S=z.union([VerificationReview,DocumentReview]);
const notificationCopy={
 APPROVED:{title:'Verification approved',body:'DriveDrop has approved your transporter verification. Your verified status is now active.'},
 REJECTED:{title:'Verification requires changes',body:'DriveDrop has reviewed your transporter verification and changes are required. Review the Admin note before updating your details or documents.'},
 SUSPENDED:{title:'Verification suspended',body:'DriveDrop has suspended your transporter verification.'}
} as const;

export async function GET(){
 const u=await currentUser();
 if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin access required'},{status:403});
 const transporters=await prisma.user.findMany({where:{role:'TRANSPORTER'},select:{id:true,name:true,email:true,accountStatus:true,workRestricted:true,transporterVerification:{include:{documents:{orderBy:{createdAt:'desc'}}}}},orderBy:{createdAt:'desc'}});
 const rows=transporters.map(transporter=>transporter.transporterVerification?{...transporter.transporterVerification,transporter:{id:transporter.id,name:transporter.name,email:transporter.email,accountStatus:transporter.accountStatus,workRestricted:transporter.workRestricted}}:{id:`not-started:${transporter.id}`,status:'NOT_STARTED',businessName:'Not provided',companyNumber:null,phone:null,yearsOperating:null,website:null,businessAddress:null,submittedAt:null,reviewedAt:null,reviewNote:null,documents:[],transporter:{id:transporter.id,name:transporter.name,email:transporter.email,accountStatus:transporter.accountStatus,workRestricted:transporter.workRestricted}});
 const order:Record<string,number>={PENDING:0,SUSPENDED:1,REJECTED:2,APPROVED:3,NOT_STARTED:4};
 rows.sort((a:any,b:any)=>(order[a.status]??9)-(order[b.status]??9));
 return NextResponse.json(rows);
}

export async function PATCH(r:Request){
 const u=await currentUser();
 if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin access required'},{status:403});
 const x=S.safeParse(await r.json());
 if(!x.success)return NextResponse.json({error:'Invalid review'},{status:400});
 if('documentId' in x.data){
  const documentReview=x.data;
  const document=await prisma.verificationDocument.findUnique({where:{id:documentReview.documentId},include:{verification:{select:{transporterId:true,businessName:true}}}});
  if(!document)return NextResponse.json({error:'Verification document not found'},{status:404});
  const now=new Date();const today=new Date(now);today.setUTCHours(0,0,0,0);
  if(documentReview.documentStatus==='APPROVED'&&document.type==='INSURANCE'&&(!document.expiresAt||document.expiresAt<today))return NextResponse.json({error:'Insurance must have a current or future expiry date before approval'},{status:400});
  const documentLabel=document.type.toLowerCase().replaceAll('_',' ');
  const result=await prisma.$transaction(async(tx:any)=>{
   const updated=await tx.verificationDocument.update({where:{id:document.id},data:{status:documentReview.documentStatus,reviewerId:u.id,reviewedAt:now,reviewNote:documentReview.reviewNote||null}});
   let verificationStatusChanged:null|'APPROVED'|'REJECTED'=null;
   if(['INSURANCE','DRIVING_LICENCE'].includes(document.type)){
    const approvedInsurance=await tx.verificationDocument.findFirst({where:{verificationId:document.verificationId,type:'INSURANCE',status:'APPROVED',expiresAt:{gte:today}},select:{id:true}});
    const approvedDrivingLicence=await tx.verificationDocument.findFirst({where:{verificationId:document.verificationId,type:'DRIVING_LICENCE',status:'APPROVED'},select:{id:true}});
    const currentVerification=await tx.transporterVerification.findUnique({where:{id:document.verificationId},select:{status:true}});
    if(documentReview.documentStatus==='REJECTED'&&(!approvedInsurance||!approvedDrivingLicence)){
     await tx.transporterVerification.update({where:{id:document.verificationId},data:{status:'REJECTED',reviewNote:documentReview.reviewNote||`${documentLabel.charAt(0).toUpperCase()+documentLabel.slice(1)} rejected. Upload a replacement document and submit verification again.`,reviewedAt:now,reviewerId:u.id}});
     verificationStatusChanged='REJECTED';
    }else if(documentReview.documentStatus==='APPROVED'&&approvedInsurance&&approvedDrivingLicence&&currentVerification&&['PENDING','REJECTED'].includes(currentVerification.status)){
     await tx.transporterVerification.update({where:{id:document.verificationId},data:{status:'APPROVED',reviewNote:null,reviewedAt:now,reviewerId:u.id}});
     verificationStatusChanged='APPROVED';
    }
   }
   return {updated,verificationStatusChanged};
  });
  const verificationApproved=result.verificationStatusChanged==='APPROVED';
  const verificationRejected=result.verificationStatusChanged==='REJECTED';
  await createNotificationSafely({userId:document.verification.transporterId,type:'VERIFICATION',title:verificationApproved?'Verification approved':documentReview.documentStatus==='APPROVED'?'Verification document approved':'Verification document requires changes',body:verificationApproved?'DriveDrop has approved your transporter verification. Your verified status is now active.':documentReview.documentStatus==='APPROVED'?`DriveDrop approved your new ${documentLabel} document.`:`DriveDrop reviewed your new ${documentLabel} document and changes are required.${verificationRejected?' Your transporter verification is no longer approved. Upload a replacement document and submit it for review.':''}${documentReview.reviewNote?` Admin note: ${documentReview.reviewNote}`:''}`,href:'/transporter/verification'});
  return NextResponse.json({...result.updated,verificationStatusChanged:result.verificationStatusChanged});
 }
 const review=VerificationReview.parse(x.data);
 const current=await prisma.transporterVerification.findUnique({where:{id:review.verificationId},include:{documents:{orderBy:{createdAt:'desc'},select:{type:true,status:true,expiresAt:true}}}});
 if(!current)return NextResponse.json({error:'Verification record not found'},{status:404});
 const now=new Date();
 const insuranceToday=new Date(now);insuranceToday.setUTCHours(0,0,0,0);
 if(review.status==='APPROVED'){
  const approvedInsurance=current.documents.find(document=>document.type==='INSURANCE'&&document.status==='APPROVED'&&document.expiresAt&&document.expiresAt>=insuranceToday);
  const approvedDrivingLicence=current.documents.find(document=>document.type==='DRIVING_LICENCE'&&document.status==='APPROVED');
  if(!approvedInsurance||!approvedDrivingLicence)return NextResponse.json({error:'Approve a current insurance certificate and the driving licence after comparing both documents before approving this account.'},{status:400});
 }
 const updated=await prisma.$transaction(async(tx:any)=>{
  await tx.verificationDocument.updateMany({where:{verificationId:current.id,status:{not:'REJECTED'},expiresAt:{lt:insuranceToday}},data:{status:'EXPIRED',reviewerId:u.id,reviewedAt:now}});
  if(review.status==='REJECTED')await tx.verificationDocument.updateMany({where:{verificationId:current.id,status:'PENDING'},data:{status:'REJECTED',reviewerId:u.id,reviewedAt:now,reviewNote:review.reviewNote}});
  return tx.transporterVerification.update({where:{id:current.id},data:{status:review.status,reviewNote:review.reviewNote,reviewedAt:now,reviewerId:u.id}});
 });
 if(current.status!==review.status){
  const copy=notificationCopy[review.status];
  await createNotificationSafely({userId:current.transporterId,type:'VERIFICATION',title:copy.title,body:copy.body});
 }
 return NextResponse.json(updated);
}
