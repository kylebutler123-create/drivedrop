import { randomUUID } from 'crypto';

export const VERIFICATION_BUCKET = 'transporter-verification';
export const MAX_VERIFICATION_FILE_SIZE = 4 * 1024 * 1024;

const allowedTypes: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

function config() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Supabase storage environment is not configured');
  return { url: url.replace(/\/$/, ''), serviceRoleKey };
}

export function validateVerificationFile(file: File) {
  const extension = allowedTypes[file.type];
  if (!extension) return { ok: false as const, error: 'Only PDF, JPG/JPEG and PNG files are allowed' };
  if (file.size <= 0) return { ok: false as const, error: 'The selected file is empty' };
  if (file.size > MAX_VERIFICATION_FILE_SIZE) return { ok: false as const, error: 'File must be 4 MB or smaller' };
  return { ok: true as const, extension };
}

export function createVerificationStoragePath(userId: string, verificationId: string, extension: string) {
  return `${userId}/${verificationId}/${randomUUID()}.${extension}`;
}

export async function uploadVerificationFile(path: string, file: File) {
  const { url, serviceRoleKey } = config();
  const response = await fetch(`${url}/storage/v1/object/${VERIFICATION_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: await file.arrayBuffer(),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Verification document upload failed', response.status, detail);
    throw new Error('Document upload failed');
  }
}

export async function downloadVerificationFile(path: string) {
  const { url, serviceRoleKey } = config();
  return fetch(`${url}/storage/v1/object/authenticated/${VERIFICATION_BUCKET}/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: 'no-store',
  });
}
