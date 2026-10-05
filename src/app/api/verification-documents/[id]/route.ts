import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { createVerificationDownloadUrl } from '@/lib/supabase-storage';

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

  try {
    // A 60-second private link avoids routing a 20 MB response through Vercel.
    const url = await createVerificationDownloadUrl(document.documentUrl);
    return new Response(null, {status:307,headers:{Location:url,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
  } catch {
    return NextResponse.json({ error: 'Unable to retrieve document' }, { status: 502 });
  }
}
