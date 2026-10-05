import {randomUUID} from 'crypto';
import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {notifyAdminsSafely} from '@/lib/notifications';
import {checkRateLimit,rateLimitResponse} from '@/lib/rate-limit';
import {createVerificationStoragePath,createVerificationUploadUrl,validateStoredVerificationFile,removeVerificationFile} from '@/lib/supabase-storage';
import {verificationUploadSchema,verificationExpiryError,signVerificationUpload,readVerificationUpload} from '@/lib/verification-upload-ticket';

export const runtime='nodejs';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
function sameOrigin(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin}

// Only metadata passes through Vercel. The file is sent to a single signed private object.
export async function POST(request:Request){
  const user=await currentUser();
  if(!user||user.role!=='TRANSPORTER'||user.accountStatus!=='ACTIVE')return json({error:'Transporter access required'},403);
  if(!sameOrigin(request))return json({error:'Invalid request origin'},403);
  const rate=checkRateLimit(request,'verification-upload-start',30,10*60*1000,user.id);
  if(!rate.allowed)return rateLimitResponse(rate.retryAfterSeconds);
  const parsed=verificationUploadSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return json({error:'Choose a PDF, JPG/JPEG or PNG document of 20 MB or smaller. Phone photos must be converted before upload.'},400);
  const expiryError=verificationExpiryError(parsed.data);if(expiryError)return json({error:expiryError},400);
  const verification=await prisma.transporterVerification.findUnique({where:{transporterId:user.id}});
  if(!verification)return json({error:'Save business details first'},400);
  const extension={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'}[parsed.data.contentType];
  const path=createVerificationStoragePath(user.id,verification.id,extension);
  try{
    const receipt=signVerificationUpload({...parsed.data,version:1,userId:user.id,verificationId:verification.id,documentId:randomUUID(),path,expires:Date.now()+30*60*1000});
    const signedUrl=await createVerificationUploadUrl(path);
    return json({signedUrl,receipt});
  }catch{return json({error:'Unable to prepare a secure upload. Please try again.'},503)}
}

export async function PATCH(request:Request){
  const user=await currentUser();
  if(!user||user.role!=='TRANSPORTER'||user.accountStatus!=='ACTIVE')return json({error:'Transporter access required'},403);
  if(!sameOrigin(request))return json({error:'Invalid request origin'},403);
  const rate=checkRateLimit(request,'verification-upload-finish',60,10*60*1000,user.id);
  if(!rate.allowed)return rateLimitResponse(rate.retryAfterSeconds);
  const body=await request.json().catch(()=>null);
  if(typeof body?.receipt!=='string')return json({error:'Invalid upload confirmation'},400);
  try{
    const ticket=readVerificationUpload(body.receipt);
    if(!ticket||ticket.userId!==user.id)return json({error:'Upload confirmation is invalid or expired. Please upload again.'},400);
    const verification=await prisma.transporterVerification.findUnique({where:{transporterId:user.id}});
    if(!verification||verification.id!==ticket.verificationId)return json({error:'Verification account not found'},403);
    // A retry after a lost response returns the same record, never a duplicate document.
    const existing=await prisma.verificationDocument.findUnique({where:{id:ticket.documentId}});
    if(existing){
      if(existing.uploaderId!==user.id||existing.verificationId!==verification.id)return json({error:'Access denied'},403);
      return json(existing);
    }
    const expiryError=verificationExpiryError(ticket);if(expiryError)return json({error:expiryError},400);
    const validation=await validateStoredVerificationFile(ticket.path,ticket.contentType,ticket.size);
    if(!validation.ok){await removeVerificationFile(ticket.path).catch(()=>{});return json({error:validation.error},400)}
    let document;
    try{
      document=await prisma.verificationDocument.create({data:{id:ticket.documentId,verificationId:verification.id,uploaderId:user.id,type:ticket.type,documentUrl:ticket.path,policyNumber:ticket.policyNumber,insurer:ticket.insurer,expiresAt:ticket.expiresAt?new Date(`${ticket.expiresAt}T00:00:00.000Z`):undefined}});
    }catch(error){
      if((error as {code?:string}).code==='P2002'){
        const saved=await prisma.verificationDocument.findUnique({where:{id:ticket.documentId}});
        if(saved&&saved.uploaderId===user.id&&saved.verificationId===verification.id)return json(saved);
      }
      throw error;
    }
    if(verification.status==='APPROVED')await notifyAdminsSafely({type:'ADMIN_VERIFICATION',title:ticket.type==='INSURANCE'?'Replacement insurance needs review':'New verification document needs review',body:`${verification.businessName||user.name} uploaded a new ${ticket.type.toLowerCase().replaceAll('_',' ')} document for an approved transporter account.`,href:'/admin'});
    return json(document,201);
  }catch{return json({error:'Unable to confirm document upload right now. Please try again.'},503)}
}
