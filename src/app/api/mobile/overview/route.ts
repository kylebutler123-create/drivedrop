import {prisma} from '@/lib/prisma';
import {notificationForAccount} from '@/lib/price-visibility';
import {mobileEnabled, mobileJson, mobileRequestSession, mobileUnavailable} from '@/lib/mobile-auth';
import {mobileWebPath} from '@/lib/mobile-policy';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!mobileEnabled()) return mobileUnavailable();
  const session = await mobileRequestSession(request);
  if (!session) return mobileJson({error: 'Please sign in again.'}, 401);
  const {user} = session;
  const owner = user.role === 'CUSTOMER' ? {customerId: user.id} : {transporterId: user.id};
  const [bookings, notifications] = await Promise.all([
    prisma.booking.findMany({
      where: {...owner, status: {notIn: ['DELIVERED', 'CANCELLED']}},
      orderBy: {job: {collectionDate: 'asc'}}, take: 50,
      select: {id: true, status: true, job: {select: {vehicleMake: true, vehicleModel: true, registration: true, collection: true, delivery: true, collectionDate: true, collectionFrom: true, collectionUntil: true}}},
    }),
    prisma.$queryRaw<Array<{id: string; type: string; title: string; body: string; href: string | null; readAt: Date | null; createdAt: Date}>>`
      SELECT "id", "type", "title", "body", "href", "readAt", "createdAt"
      FROM "Notification" WHERE "userId"=${user.id} ORDER BY "createdAt" DESC LIMIT 50
    `,
  ]);
  return mobileJson({
    version: 1,
    user: {id: user.id, name: user.name, email: user.email, role: user.role, workRestricted: user.workRestricted},
    bookings,
    notifications: notifications.map(item => ({...notificationForAccount(item, user.role), href: mobileWebPath(item.href, user.role)})),
    fetchedAt: new Date().toISOString(),
  });
}
