import {createHmac,timingSafeEqual} from 'crypto';
import {z} from 'zod';
import {MAX_VERIFICATION_UPLOAD_SIZE} from './verification-file-policy';

export const verificationMetadataSchema=z.object({
  type:z.enum(['INSURANCE','DRIVING_LICENCE','COMPANY_REGISTRATION','IDENTITY','OPERATOR_LICENCE','OTHER']),
  policyNumber:z.string().max(100).optional(),insurer:z.string().max(150).optional(),
  expiresAt:z.string().max(10).optional(),
});
export const verificationUploadSchema=verificationMetadataSchema.extend({
  contentType:z.enum(['application/pdf','image/jpeg','image/png']),
  size:z.number().int().min(1).max(MAX_VERIFICATION_UPLOAD_SIZE),
});
const ticketSchema=verificationUploadSchema.extend({
  version:z.literal(1),userId:z.string().min(1),verificationId:z.string().min(1),
  documentId:z.string().uuid(),path:z.string().min(1),expires:z.number().int(),
});
export type VerificationUploadTicket=z.infer<typeof ticketSchema>;
function signature(payload:string){
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret)throw new Error('Private upload signing is not configured');
  return createHmac('sha256',secret).update('drivedrop-verification-upload-v1\0').update(payload).digest();
}
export function signVerificationUpload(ticket:VerificationUploadTicket){
  const payload=Buffer.from(JSON.stringify(ticketSchema.parse(ticket))).toString('base64url');
  return `${payload}.${signature(payload).toString('base64url')}`;
}
export function readVerificationUpload(token:string):VerificationUploadTicket|null {
  if(token.length>6000)return null;
  const parts=token.split('.');if(parts.length!==2)return null;
  const [payload,mac]=parts;const expected=signature(payload);const supplied=Buffer.from(mac,'base64url');
  if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return null;
  try{const ticket=ticketSchema.parse(JSON.parse(Buffer.from(payload,'base64url').toString('utf8')));return ticket.expires>Date.now()?ticket:null}catch{return null}
}
export function verificationExpiryError(data:z.infer<typeof verificationMetadataSchema>):string|null {
  if(data.type==='INSURANCE'&&!data.expiresAt)return 'Enter the insurance expiry date';
  if(!data.expiresAt)return null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data.expiresAt))return 'Enter a valid document expiry date';
  const date=new Date(`${data.expiresAt}T00:00:00.000Z`);
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==data.expiresAt)return 'Enter a valid document expiry date';
  const today=new Date();today.setUTCHours(0,0,0,0);
  return data.type==='INSURANCE'&&date<today?'Replacement insurance must have a current or future expiry date':null;
}
