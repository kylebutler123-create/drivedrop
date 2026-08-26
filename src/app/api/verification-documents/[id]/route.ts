import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { downloadVerificationFile } from '@/lib/supabase-storage';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id } = await context.params;
  const document = await prisma.verificationDocument.findUnique({
    where: { id },
    include: { verification: { select: { transporterId: true } } },
  });
  if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const isOwner = user.role === 'TRANSPORTER' && document.verification.transporterId === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const stored = await downloadVerificationFile(document.documentUrl);
  if (!stored.ok || !stored.body) {
    console.error('Verification document download failed', stored.status, await stored.text().catch(() => ''));
    return NextResponse.json({ error: 'Unable to retrieve document' }, { status: 502 });
  }

  const headers = new Headers();
  headers.set('Content-Type', stored.headers.get('content-type') || 'application/octet-stream');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Disposition', 'inline');
  return new Response(stored.body, { status: 200, headers });
}
