/** Isolated CI fixtures only. Never runs against a shared or remote database. */
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {readFile} from 'node:fs/promises';

const url = new URL(process.env.POSTGRES_PRISMA_URL || '');
if (process.env.CI !== 'true' || process.env.DRIVEDROP_ISOLATED_BROWSER_TEST !== 'true' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432' || url.pathname !== '/drivedrop_browser_ci') {
  throw new Error('Refusing fixture setup outside the explicitly isolated local CI database.');
}
if (process.env.RESEND_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY) throw new Error('No external service secrets may be supplied to browser fixtures.');
const prisma = new PrismaClient();
const stamp = new Date('2026-09-20T12:00:00Z');
const passwordHash = await bcrypt.hash('DriveDrop-local-fixture-2026!', 10);
try {
  // Existing application raw-SQL fields not currently represented in schema.prisma.
  // This is test-fixture setup, not a migration for the deployed application.
  const ddl = [
    'ALTER TABLE "TransportJob" ADD COLUMN IF NOT EXISTS "vehicleType" TEXT',
    'ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "pocReleasedByName" TEXT, ADD COLUMN IF NOT EXISTS "pocCondition" TEXT, ADD COLUMN IF NOT EXISTS "pocDamageNotes" TEXT, ADD COLUMN IF NOT EXISTS "pocSubmittedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "podRecipientName" TEXT, ADD COLUMN IF NOT EXISTS "podNotes" TEXT, ADD COLUMN IF NOT EXISTS "podSubmittedAt" TIMESTAMP(3)',
    'CREATE TABLE IF NOT EXISTS "TransporterPayoutDetails" ("id" TEXT PRIMARY KEY, "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id"), "accountHolderName" TEXT NOT NULL, "sortCodeLast2" TEXT NOT NULL, "accountNumberLast4" TEXT NOT NULL, "detailsToken" TEXT NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL)',
    'CREATE TABLE IF NOT EXISTS "MessageAttachment" ("id" TEXT PRIMARY KEY, "messageId" TEXT NOT NULL REFERENCES "Message"("id"), "storagePath" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  ];
  for (const statement of ddl) await prisma.$executeRawUnsafe(statement);
  const notificationDDL = await readFile('prisma/migrations/20260829145500_add_notifications/migration.sql', 'utf8');
  for (const statement of notificationDDL.split(';').map(s => s.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
  for (const role of ['CUSTOMER', 'TRANSPORTER', 'ADMIN']) {
    await prisma.user.create({data:{id:`ci-${role.toLowerCase()}`,email:`${role.toLowerCase()}@drivedrop.example.test`,name:`CI ${role[0]}${role.slice(1).toLowerCase()}`,phone:'07700900001',role,passwordHash,createdAt:stamp}});
  }
  await prisma.transporterVerification.create({data:{id:'ci-verification',transporterId:'ci-transporter',businessName:'CI Example Transport',businessAddress:'Example address — isolated test fixture',phone:'07700900002',yearsOperating:5,status:'APPROVED',submittedAt:stamp,reviewedAt:stamp,createdAt:stamp,updatedAt:stamp}});
  for (const type of ['INSURANCE','DRIVING_LICENCE']) {
    await prisma.verificationDocument.create({data:{id:`ci-document-${type.toLowerCase()}`,verificationId:'ci-verification',uploaderId:'ci-transporter',type,documentUrl:'CI_METADATA_ONLY_NO_EXTERNAL_STORAGE',status:'APPROVED',expiresAt:type==='INSURANCE'?new Date('2036-01-01T00:00:00Z'):null,createdAt:stamp,reviewedAt:stamp}});
  }
  await prisma.$executeRawUnsafe('INSERT INTO "TransporterPayoutDetails" VALUES ($1,$2,$3,$4,$5,$6,$7,$7)', 'ci-payout-details','ci-transporter','CI Example Transport','00','0000','SANDBOX_TEST_ONLY',stamp);
  const definitions = [
    ['open','OPEN',null,null,null,'BMW','3 Series'],
    ['quoted','QUOTED',null,null,null,'Ford','Transit'],
    ['active','BOOKED','COLLECTION_SCHEDULED','NOT_READY',null,'Audi','A6'],
    ['transit','BOOKED','IN_TRANSIT','NOT_READY',null,'Mercedes','E-Class'],
    ['awaiting','COMPLETED','DELIVERED','NOT_READY',null,'Volkswagen','Golf'],
    ['ready','COMPLETED','DELIVERED','READY',stamp,'Porsche','911'],
    ['paid','COMPLETED','DELIVERED','PAID',stamp,'Land Rover','Sport'],
    ['cancelled','CANCELLED','CANCELLED','CANCELLED',null,'Vauxhall','Astra'],
    ['held','BOOKED','IN_TRANSIT','HELD',null,'Volvo','XC60'],
  ];
  for (let i=0;i<definitions.length;i++) {
    const [suffix, jobStatus, bookingStatus, payoutStatus, customerConfirmedAt,vehicleMake,vehicleModel] = definitions[i];
    const jobId=`ci-job-${suffix}`;
    await prisma.transportJob.create({data:{id:jobId,customerId:'ci-customer',collection:'Manchester M1 — CI fixture',delivery:'Bristol BS1 — CI fixture',collectionDate:new Date('2030-10-15T12:00:00Z'),transportType:'OPEN',vehicleMake,vehicleModel,registration:`CI0${i} TST`,running:true,status:jobStatus,createdAt:suffix==='open'||suffix==='quoted'?new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z'):stamp}});
    await prisma.$executeRawUnsafe('UPDATE "TransportJob" SET "vehicleType"=$1 WHERE "id"=$2',vehicleMake==='Ford'?'Van':'Car',jobId);
    if (suffix==='open') continue;
    await prisma.quote.create({data:{id:`ci-quote-${suffix}`,jobId,transporterId:'ci-transporter',pricePence:30000,status:suffix==='quoted'?'PENDING':suffix==='cancelled'?'DECLINED':'ACCEPTED',message:'Illustrative quotation for isolated browser testing.',createdAt:stamp}});
    if (!bookingStatus) continue;
    const bookingId=`ci-booking-${suffix}`;
    await prisma.booking.create({data:{id:bookingId,jobId,quoteId:`ci-quote-${suffix}`,customerId:'ci-customer',transporterId:'ci-transporter',agreedPricePence:30000,status:bookingStatus,customerConfirmedAt,createdAt:stamp}});
    await prisma.bookingPayment.create({data:{id:`ci-payment-${suffix}`,bookingId,transportValuePence:33000,depositPence:33000,platformFeePence:3000,transporterProceedsPence:suffix==='cancelled'?0:30000,remainingBalancePence:0,paidPence:33000,refundedPence:suffix==='cancelled'?33000:0,status:suffix==='cancelled'?'REFUNDED':'PAID',payoutStatus,provider:'TEST',providerReference:'CI_ONLY',createdAt:stamp,updatedAt:stamp}});
    await prisma.trackingEvent.create({data:{bookingId,status:bookingStatus,actorId:'ci-transporter',note:'CI fixture event',createdAt:stamp}});
    if (suffix==='paid'||suffix==='ready') await prisma.financeEvent.create({data:{paymentId:`ci-payment-${suffix}`,type:suffix==='paid'?'PAYOUT_PAID':'PAYOUT_READY',amountPence:30000,createdAt:stamp}});
    await prisma.message.create({data:{bookingId,senderId:'ci-transporter',body:'CI fixture: collection details are recorded here.',readAt:stamp,createdAt:stamp}});
    if (suffix==='paid') await prisma.review.create({data:{bookingId,customerId:'ci-customer',transporterId:'ci-transporter',rating:5,body:'Illustrative review — isolated test data, not a real customer endorsement.',createdAt:stamp}});
    if (suffix==='held') await prisma.dispute.create({data:{id:'ci-dispute-held',bookingId,raisedById:'ci-customer',reason:'CI test dispute',details:'Isolated fixture to inspect dispute controls. No real dispute.',status:'OPEN',createdAt:stamp,updatedAt:stamp}});
  }
  for (const role of ['customer','transporter','admin']) await prisma.$executeRawUnsafe('INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7)',`ci-notification-${role}`,`ci-${role}`,'ACCOUNT','CI fixture notification','Isolated browser-test notification, not a live marketplace event.',`/${role}`,stamp);
  console.log('Seeded isolated CI accounts, verification metadata, jobs, bookings, messages, payouts and a dispute. No external service credentials.');
} finally {await prisma.$disconnect();}
