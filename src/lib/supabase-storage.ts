import { randomUUID } from 'crypto';

export const VERIFICATION_BUCKET = 'transporter-verification';
export const EVIDENCE_BUCKET = 'delivery-evidence';
export const PROFILE_BUCKET = 'transporter-profiles';
export const MAX_VERIFICATION_FILE_SIZE = 4 * 1024 * 1024;
export const MAX_EVIDENCE_FILE_SIZE = 8 * 1024 * 1024;
export const MAX_PROFILE_FILE_SIZE = 2 * 1024 * 1024;

const verificationTypes: Record<string, string> = {'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'};
const evidenceTypes: Record<string, string> = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const profileTypes: Record<string, string> = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};

function config(){const url=process.env.SUPABASE_URL;const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!serviceRoleKey)throw new Error('Supabase storage environment is not configured');return{url:url.replace(/\/$/,''),serviceRoleKey}}
function validate(file:File,types:Record<string,string>,max:number,label:string){const extension=types[file.type];if(!extension)return{ok:false as const,error:`Only ${label} files are allowed`};if(file.size<=0)return{ok:false as const,error:'The selected file is empty'};if(file.size>max)return{ok:false as const,error:`File must be ${Math.round(max/1024/1024)} MB or smaller`};return{ok:true as const,extension}}
function startsWith(bytes:Uint8Array,signature:number[]){return signature.every((value,index)=>bytes[index]===value)}
async function hasValidSignature(file:File){const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());switch(file.type){case'application/pdf':return startsWith(bytes,[0x25,0x50,0x44,0x46,0x2d]);case'image/jpeg':return startsWith(bytes,[0xff,0xd8,0xff]);case'image/png':return startsWith(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);case'image/webp':return startsWith(bytes,[0x52,0x49,0x46,0x46])&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50;default:return false}}
async function validateWithSignature(file:File,types:Record<string,string>,max:number,label:string){const basic=validate(file,types,max,label);if(!basic.ok)return basic;if(!(await hasValidSignature(file)))return{ok:false as const,error:'File contents do not match the selected file type'};return basic}
async function upload(bucket:string,path:string,file:File){const{url,serviceRoleKey}=config();const response=await fetch(`${url}/storage/v1/object/${bucket}/${path}`,{method:'POST',headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`,'Content-Type':file.type,'x-upsert':'false'},body:await file.arrayBuffer()});if(!response.ok){console.error('Private upload failed',response.status,await response.text().catch(()=>''));throw new Error('Upload failed')}}
async function download(bucket:string,path:string){const{url,serviceRoleKey}=config();return fetch(`${url}/storage/v1/object/authenticated/${bucket}/${path}`,{headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`},cache:'no-store'})}
async function remove(bucket:string,path:string){const{url,serviceRoleKey}=config();const response=await fetch(`${url}/storage/v1/object/${bucket}`,{method:'DELETE',headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});if(!response.ok)console.error('Storage delete failed',response.status,await response.text().catch(()=>''))}

export function validateVerificationFile(file:File){return validateWithSignature(file,verificationTypes,MAX_VERIFICATION_FILE_SIZE,'PDF, JPG/JPEG and PNG')}
export function createVerificationStoragePath(userId:string,verificationId:string,extension:string){return `${userId}/${verificationId}/${randomUUID()}.${extension}`}
export async function uploadVerificationFile(path:string,file:File){return upload(VERIFICATION_BUCKET,path,file)}
export async function downloadVerificationFile(path:string){return download(VERIFICATION_BUCKET,path)}

export function validateEvidenceFile(file:File){return validateWithSignature(file,evidenceTypes,MAX_EVIDENCE_FILE_SIZE,'JPG/JPEG, PNG and WebP image')}
export function createEvidenceStoragePath(bookingId:string,userId:string,extension:string){return `${bookingId}/${userId}/${randomUUID()}.${extension}`}
export async function uploadEvidenceFile(path:string,file:File){return upload(EVIDENCE_BUCKET,path,file)}
export async function downloadEvidenceFile(path:string){return download(EVIDENCE_BUCKET,path)}

export function validateProfileImage(file:File){return validateWithSignature(file,profileTypes,MAX_PROFILE_FILE_SIZE,'JPG/JPEG, PNG and WebP image')}
export function createProfileStoragePath(userId:string,extension:string){return `${userId}/${randomUUID()}.${extension}`}
export async function uploadProfileImage(path:string,file:File){return upload(PROFILE_BUCKET,path,file)}
export async function removeProfileImage(path:string){return remove(PROFILE_BUCKET,path)}
export function profileImageUrl(path:string|null|undefined){if(!path)return null;const {url}=config();return `${url}/storage/v1/object/public/${PROFILE_BUCKET}/${path}`}
