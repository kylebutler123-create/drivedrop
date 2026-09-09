import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { notifyAdminsSafely } from '@/lib/notifications';
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
  if (parsed.data.type === 'INSURANCE' && !parsed.data.expiresAt) {
    return NextResponse.json({ error: 'Enter the insurance expiry date' }, { status: 400 });
  }
  const expiryDate = parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T00:00:00.000Z`) : undefined;
  if (expiryDate && !Number.isFinite(expiryDate.getTime())) {
    return NextResponse.json({ error: 'Enter a valid document expiry date' }, { status: 400 });
  }
  if (parsed.data.type === 'INSURANCE' && expiryDate) {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (expiryDate < today) return NextResponse.json({ error: 'Replacement insurance must have a current or future expiry date' }, { status: 400 });
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
    const replacementForApprovedAccount = verification.status === 'APPROVED';
    const document = await prisma.$transaction(async (tx: any) => {
      const created = await tx.verificationDocument.create({
        data: {
          verificationId: verification.id,
          uploaderId: user.id,
          type: parsed.data.type,
          documentUrl: storagePath,
          policyNumber: parsed.data.policyNumber,
          insurer: parsed.data.insurer,
          expiresAt: expiryDate,
        },
      });
      if (replacementForApprovedAccount) {
        await tx.transporterVerification.update({
          where: { id: verification.id },
          data: { status: 'PENDING', submittedAt: new Date(), reviewedAt: null, reviewerId: null, reviewNote: null },
        });
      }
      return created;
    });
    if (replacementForApprovedAccount) {
      await notifyAdminsSafely({
        type: 'ADMIN_VERIFICATION',
        title: parsed.data.type === 'INSURANCE' ? 'Replacement insurance needs review' : 'New verification document needs review',
        body: `${verification.businessName || user.name} uploaded a new ${parsed.data.type.toLowerCase().replaceAll('_', ' ')} document for an approved transporter account.`,
        href: '/admin',
      });
    }
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Verification document creation failed', error);
    return NextResponse.json({ error: 'Unable to upload document right now' }, { status: 500 });
  }
}
