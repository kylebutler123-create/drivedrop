import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { z } from 'zod';
import {
  createVerificationStoragePath,
  uploadVerificationFile,
  validateVerificationFile,
} from '@/lib/supabase-storage';

const metadataSchema = z.object({
  type: z.enum(['INSURANCE', 'COMPANY_REGISTRATION', 'IDENTITY', 'OPERATOR_LICENCE', 'OTHER']),
  policyNumber: z.string().max(100).optional(),
  insurer: z.string().max(150).optional(),
  expiresAt: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'TRANSPORTER') {
    return NextResponse.json({ error: 'Transporter access required' }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a document to upload' }, { status: 400 });
  }

  const parsed = metadataSchema.safeParse({
    type: form.get('type'),
    policyNumber: String(form.get('policyNumber') || '') || undefined,
    insurer: String(form.get('insurer') || '') || undefined,
    expiresAt: String(form.get('expiresAt') || '') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid document details' }, { status: 400 });
  }

  const validation = await validateVerificationFile(file);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const verification = await prisma.transporterVerification.findUnique({
    where: { transporterId: user.id },
  });
  if (!verification) {
    return NextResponse.json({ error: 'Save business details first' }, { status: 400 });
  }

  const storagePath = createVerificationStoragePath(user.id, verification.id, validation.extension);

  try {
    await uploadVerificationFile(storagePath, file);
    const document = await prisma.verificationDocument.create({
      data: {
        verificationId: verification.id,
        uploaderId: user.id,
        type: parsed.data.type,
        documentUrl: storagePath,
        policyNumber: parsed.data.policyNumber,
        insurer: parsed.data.insurer,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Verification document creation failed', error);
    return NextResponse.json({ error: 'Unable to upload document right now' }, { status: 500 });
  }
}
