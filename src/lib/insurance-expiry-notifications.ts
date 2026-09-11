import {prisma} from '@/lib/prisma';

type InsuranceDocumentSnapshot={
 id:string;
 type:string;
 status:string;
 expiresAt:Date|null;
 createdAt:Date;
};

type VerificationSnapshot={
 id:string;
 status:string;
 reviewedAt:Date|null;
 documents:InsuranceDocumentSnapshot[];
};

export type TransporterInsuranceStatus={
 state:'VALID'|'EXPIRING'|'EXPIRED'|'MISSING';
 expiresAt:Date|null;
 daysRemaining:number|null;
 documentId:string|null;
 replacementPending:boolean;
};

type WarningStage='missing'|'30-day'|'7-day'|'expired';

const DAY_MS=24*60*60*1000;

function utcDay(value:Date){
 return Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate());
}

export function insuranceWarningStage(expiresAt:Date,today=new Date()):Exclude<WarningStage,'missing'>|null{
 const daysRemaining=Math.round((utcDay(expiresAt)-utcDay(today))/DAY_MS);
 if(daysRemaining<0)return 'expired';
 if(daysRemaining<=7)return '7-day';
 if(daysRemaining<=30)return '30-day';
 return null;
}

export function insuranceStatusForVerification(verification:VerificationSnapshot|null,today=new Date()):TransporterInsuranceStatus{
 if(!verification)return {state:'MISSING',expiresAt:null,daysRemaining:null,documentId:null,replacementPending:false};
 const reviewedAt=verification.reviewedAt?.getTime()??null;
 const insurance=verification.documents
  .filter(document=>document.type==='INSURANCE'&&document.status!=='REJECTED')
  .sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime());
 const isEffectivelyApproved=(document:InsuranceDocumentSnapshot)=>
  document.status==='APPROVED'||
  (verification.status==='APPROVED'&&document.status==='PENDING'&&reviewedAt!==null&&document.createdAt.getTime()<=reviewedAt);
 const approvedInsurance=insurance.find(document=>isEffectivelyApproved(document)&&document.expiresAt);
 const replacementPending=insurance.some(document=>document.status==='PENDING'&&(reviewedAt===null||document.createdAt.getTime()>reviewedAt));
 if(!approvedInsurance?.expiresAt)return {state:'MISSING',expiresAt:null,daysRemaining:null,documentId:null,replacementPending};
 const daysRemaining=Math.round((utcDay(approvedInsurance.expiresAt)-utcDay(today))/DAY_MS);
 return {
  state:daysRemaining<0?'EXPIRED':daysRemaining<=30?'EXPIRING':'VALID',
  expiresAt:approvedInsurance.expiresAt,
  daysRemaining,
  documentId:approvedInsurance.id,
  replacementPending,
 };
}

function warningStage(status:TransporterInsuranceStatus):WarningStage|null{
 if(status.state==='MISSING')return 'missing';
 if(status.state==='EXPIRED')return 'expired';
 if(status.state==='EXPIRING'&&status.daysRemaining!==null)return status.daysRemaining<=7?'7-day':'30-day';
 return null;
}

function notificationCopy(stage:WarningStage,expiresAt:Date|null,replacementPending=false){
 const date=expiresAt?.toLocaleDateString('en-GB',{timeZone:'UTC'});
 const pending=replacementPending?' Your uploaded replacement is awaiting DriveDrop approval.':'';
 if(stage==='missing')return {
  title:'Replacement insurance required',
  body:`There is no valid approved insurance on your account.${pending} New quote submissions are blocked until replacement insurance is approved. Active deliveries are unaffected.`,
 };
 if(stage==='expired')return {
  title:'Replacement insurance required',
  body:`Your insurance expired on ${date}.${pending} New quote submissions are blocked until replacement insurance is approved. Active deliveries are unaffected.`,
 };
 if(stage==='7-day')return {
  title:'Insurance expires within 7 days',
  body:`Your approved insurance expires on ${date}. Upload replacement insurance now to avoid losing access to new quotes.`,
 };
 return {
  title:'Insurance expires within 30 days',
  body:`Your approved insurance expires on ${date}. Upload replacement insurance early to avoid losing access to new quotes.`,
 };
}

function notificationId(verificationId:string,status:TransporterInsuranceStatus,stage:WarningStage){
 const source=status.documentId||verificationId;
 return `insurance-expiry:${source}:${stage}`;
}

export async function ensureTransporterInsuranceNotification(input:{
 transporterId:string;
 verificationId:string;
 insuranceStatus:TransporterInsuranceStatus;
}){
 const stage=warningStage(input.insuranceStatus);
 if(!stage)return 0;
 const copy=notificationCopy(stage,input.insuranceStatus.expiresAt,input.insuranceStatus.replacementPending);
 return prisma.$executeRaw`
  INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt")
  VALUES (
   ${notificationId(input.verificationId,input.insuranceStatus,stage)},
   ${input.transporterId},
   'VERIFICATION',
   ${copy.title},
   ${copy.body},
   '/transporter/verification',
   NOW()
  )
  ON CONFLICT ("id") DO NOTHING
 `;
}

export async function sendInsuranceExpiryNotifications(today=new Date()){
 const verifications=await prisma.transporterVerification.findMany({
  where:{status:'APPROVED'},
  select:{
   id:true,
   status:true,
   reviewedAt:true,
   transporterId:true,
   businessName:true,
   transporter:{select:{name:true}},
   documents:{
    where:{type:'INSURANCE',status:{not:'REJECTED'}},
    select:{id:true,type:true,status:true,expiresAt:true,createdAt:true},
    orderBy:{createdAt:'desc'},
   },
  },
 });

 const due=verifications.flatMap(verification=>{
  const insuranceStatus=insuranceStatusForVerification(verification,today);
  const stage=warningStage(insuranceStatus);
  return stage?[{verification,insuranceStatus,stage}]:[];
 });

 const inserted=await Promise.all(due.map(({verification,insuranceStatus})=>
  ensureTransporterInsuranceNotification({
   transporterId:verification.transporterId,
   verificationId:verification.id,
   insuranceStatus,
  })
 ));

 const adminDue=due.filter(item=>item.stage==='expired'||item.stage==='missing');
 const admins=adminDue.length?await prisma.user.findMany({
  where:{role:'ADMIN',accountStatus:'ACTIVE'},
  select:{id:true},
 }):[];
 const adminInserted=await Promise.all(adminDue.flatMap(({verification,insuranceStatus,stage})=>{
  const copy=notificationCopy(stage,insuranceStatus.expiresAt,insuranceStatus.replacementPending);
  const transporter=verification.businessName.trim()||verification.transporter.name.trim()||'A transporter';
  const source=insuranceStatus.documentId||verification.id;
  return admins.map(admin=>prisma.$executeRaw`
   INSERT INTO "Notification" ("id","userId","type","title","body","href","createdAt")
   VALUES (
    ${`insurance-expiry-admin:${source}:${stage}:${admin.id}`},
    ${admin.id},
    'ACCOUNT',
    'Transporter replacement insurance required',
    ${`${transporter}: ${copy.body}`},
    '/admin?action=verification',
    NOW()
   )
   ON CONFLICT ("id") DO NOTHING
  `);
 }));

 return {
  checked:verifications.length,
  due:due.length,
  created:inserted.reduce((sum,count)=>sum+count,0),
  adminCreated:adminInserted.reduce((sum,count)=>sum+count,0),
 };
}
