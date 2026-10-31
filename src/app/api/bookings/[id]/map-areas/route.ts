import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {deliveryMapArea} from '@/lib/delivery-map-areas';

const headers = {'Cache-Control': 'private, no-store'};

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const user = await currentUser();
  if (!user) return NextResponse.json({}, {status: 401, headers});
  if (user.role !== 'CUSTOMER' || user.accountStatus !== 'ACTIVE') return NextResponse.json({}, {status: 403, headers});
  const {id} = await params;
  const booking = await prisma.booking.findFirst({
    where: {id, customerId: user.id},
    select: {job: {select: {collection: true, delivery: true}}},
  });
  if (!booking) return NextResponse.json({}, {status: 404, headers});
  try {
    const {collection, delivery} = booking.job;
    const start = deliveryMapArea(collection);
    const [a, b] = await Promise.all([start, collection === delivery ? start : deliveryMapArea(delivery)]);
    if (!a || !b) return NextResponse.json({}, {status: 422, headers});
    return NextResponse.json({collection: a, delivery: b}, {headers});
  } catch {
    return NextResponse.json({}, {status: 503, headers});
  }
}
