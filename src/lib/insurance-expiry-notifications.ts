import {prisma} from '@/lib/prisma';

type InsuranceDocument={
 id:string;
 expiresAt:Date;
 transporterId:string;
 businessName:string;
 transporterName:string;
};

type WarningStage='30-day'|'7-day'|'expired';

const DAY_MS=24*60*60*1000;

function utcDay(value:Date){
 return Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate());
}

export function insuranceWarningStage(expiresAt:Date,today=new Date()):WarningStage|null{
 const daysRemaining=Math.round((utcDay(expiresAt)-utcDay(today))/DAY_MS);
 if(daysRemaining<0)return 'expired';
 if(daysRemaining<=7)return '7-day';
 if(daysRemaining<=30)return '30-day';
 return null;
}

function notificationCopy(stage:WarningStage,expiresAt:Date){
 const date=expiresAt.toLocaleDateString('en-GB',{timeZone:'UTC'});
 if(stage==='expired')return {
  title:'Insurance has expired',
  body:`Your insurance expired on ${date}. New quote submissions are blocked until replacement insurance is uploaded and approved. Active deliveries are unaffected.`,
 };
 if(stage==='7-day')return {
  title:'Insurance expires within 7 days',
  body:`Your latest insurance document expires on ${date}. Upload replacement insurance now to avoid losing access to new quotes.`,
 };
 return {
  title:'Insurance expires within 30 days',
  body:`Your latest insurance document expires on ${date}. Upload replacement insurance early to avoid losing access to new quotes.`,
 };
}

export async function sendInsuranceExpiryNotifications(today=new Date()){
 const documents=await prisma.$queryRaw<InsuranceDocument[]>`
  SELECT DISTINCT ON (document."verificationId")
   document."id",
   document."expiresAt",
   verification."transporterId",
   verification."businessName",
   transporter."name" AS "transporterName"
  FROM "VerificationDocument" document
  INNER JOIN "TransporterVerification" verification
   ON verification."id"=document."verificationId"
  INNER JOIN "User" transporter
   ON transporter."id"=verification."transporterId"
  WHERE document."type"='INSURANCE'
   AND document."status"<>'REJECTED'
   AND document."expiresAt" IS NOT NULL
  ORDER BY document."verificationId",document."createdAt" DESC,document."id" DESC
 `;

 const due=documents.flatMap(document=>{
  const stage=insuranceWarningStage(document.expiresAt,today);
  return stage?[{document,stage,copy:notificationCopy(stage,document.expiresAt)}]:[];
 });

 const inserted=await Promise.all(due.map(({document,stage,copy})=>prisma.$executeRaw`
  INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt")
  VALUES (
   ${`insurance-expiry:${document.id}:${stage}`},
   ${document.transporterId},
   'VERIFICATION',
   ${copy.title},
   ${copy.body},
   NULL,
   NOW()
  )
 ON CONFLICT ("id") DO NOTHING
 `));

 const expired=due.filter(item=>item.stage==='expired');
 const admins=expired.length?await prisma.user.findMany({
  where:{role:'ADMIN',accountStatus:'ACTIVE'},
  select:{id:true},
 }):[];
 const adminInserted=await Promise.all(expired.flatMap(({document})=>{
  const date=document.expiresAt.toLocaleDateString('en-GB',{timeZone:'UTC'});
  const transporter=document.businessName.trim()||document.transporterName.trim()||'A transporter';
  return admins.map(admin=>prisma.$executeRaw`
   INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt")
   VALUES (
    ${`insurance-expiry-admin:${document.id}:${admin.id}`},
    ${admin.id},
    'ACCOUNT',
    'Transporter insurance expired',
    ${`${transporter}'s insurance expired on ${date}. New quote submissions are blocked until replacement insurance is approved.`},
    '/admin',
    NOW()
   )
   ON CONFLICT ("id") DO NOTHING
  `);
 }));

 return {
  checked:documents.length,
  due:due.length,
  created:inserted.reduce((sum,count)=>sum+count,0),
  adminCreated:adminInserted.reduce((sum,count)=>sum+count,0),
 };
}
