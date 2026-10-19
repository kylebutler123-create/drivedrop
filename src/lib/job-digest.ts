import {randomUUID} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {openQuoteRequestsWhere} from './job-expiry';
import {insuranceStatusForVerification} from './insurance-expiry-notifications';
import {sendTransactionalEmailBatch,transactionalNotificationsEnabled,type SendEmailInput} from './email';
import {transportTypeDisplay} from './transport-types';

const DAY=86_400_000;
const PAGE_SIZE=100;
const LEASE_MS=360_000;
type PendingBatch={key:string;cursor:string;createdAt:string;jobIds:string[];recipients:Array<{id:string;message:SendEmailInput}>};

// Fixed 08:00 UTC cutoff: 08:00 GMT / 09:00 BST, with no DST gaps or overlap.
export function digestWindow(now=new Date()){
 const end=new Date(now);end.setUTCHours(8,0,0,0);
 if(end>now)end.setUTCDate(end.getUTCDate()-1);
 return {start:new Date(end.getTime()-DAY),end};
}

const eligibleWhere={role:'TRANSPORTER',accountStatus:'ACTIVE',workRestricted:false,dailyJobEmails:true,transporterVerification:{is:{status:'APPROVED'}}} satisfies Prisma.UserWhereInput;
const recipientSelect={id:true,email:true,name:true,transporterVerification:{select:{id:true,status:true,reviewedAt:true,documents:{where:{type:'INSURANCE',status:{not:'REJECTED'}},select:{id:true,type:true,status:true,expiresAt:true,createdAt:true},orderBy:{createdAt:'desc'}}}}} satisfies Prisma.UserSelect;
type Recipient=Prisma.UserGetPayload<{select:typeof recipientSelect}>;
function insured(user:Recipient,now:Date){return ['VALID','EXPIRING'].includes(insuranceStatusForVerification(user.transporterVerification,now).state);}
type DigestJob={id:string;vehicleMake:string;vehicleModel:string;collection:string;delivery:string;collectionDate:Date;transportType:string};

export function digestMessage(user:{email:string;name:string},jobs:DigestJob[]):SendEmailInput{
 const lines=jobs.map((job,index)=>`${index+1}. ${job.vehicleMake} ${job.vehicleModel}\n${job.collection} → ${job.delivery}\nCollection: ${job.collectionDate.toLocaleDateString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long',year:'numeric'})}\nTransport: ${transportTypeDisplay(job.transportType)}`);
 return {to:user.email,subject:'Your daily DriveDrop jobs summary',heading:'New jobs to explore',preheader:'A selection of new available jobs on DriveDrop.',body:`Hi ${user.name.trim()||'there'},\n\nHere are ${jobs.length===1?'a new vehicle transport request':'some new vehicle transport requests'} available for quotes.\n\n${lines.join('\n\n')}\n\nView available jobs for the full list and latest availability.\n\nYou receive one daily summary when new jobs are available. You can turn job emails off in Account → Email preferences.`,ctaLabel:'View available jobs',ctaPath:'/transporter',preferencesPath:'/account#email-preferences'};
}

export async function sendDailyJobDigest(now=new Date(),budgetMs=240_000){
 if(!transactionalNotificationsEnabled()||!process.env.RESEND_API_KEY)return {state:'disabled',sent:0};
 const environment=process.env.VERCEL_ENV||'development';
 const {start,end}=digestWindow(now);
 const id=`${environment}:${end.toISOString().slice(0,10)}`;
 const token=randomUUID();
 await prisma.jobDigestRun.upsert({where:{id},create:{id,windowEnd:end},update:{}});
 const acquired=await prisma.jobDigestRun.updateMany({where:{id,completed:false,OR:[{leaseUntil:null},{leaseUntil:{lt:now}}]},data:{leaseToken:token,leaseUntil:new Date(now.getTime()+LEASE_MS)}});
 if(!acquired.count)return {state:'complete-or-running',sent:0};
 const started=Date.now();
 try{
  let run=await prisma.jobDigestRun.findUniqueOrThrow({where:{id}});
  let sent=0;
  while(Date.now()-started<budgetMs){
   let pending=run.pending as PendingBatch|null;
   if(!pending){
    // Only new, still-open requests from the completed daily window. Never replay old jobs.
    const jobs=await prisma.transportJob.findMany({where:{...openQuoteRequestsWhere(),createdAt:{gte:start,lt:end}},select:{id:true,vehicleMake:true,vehicleModel:true,collection:true,delivery:true,collectionDate:true,transportType:true},orderBy:[{createdAt:'desc'},{id:'asc'}],take:5});
    if(!jobs.length){
     await prisma.jobDigestRun.update({where:{id},data:{completed:true}});
     return {state:'complete',sent};
    }
    const users=await prisma.user.findMany({where:{...eligibleWhere,...(run.cursor?{id:{gt:run.cursor}}:{}),createdAt:{lt:end}},select:recipientSelect,orderBy:{id:'asc'},take:PAGE_SIZE});
    if(!users.length){
     await prisma.jobDigestRun.update({where:{id},data:{completed:true}});
     return {state:'complete',sent};
    }
    const recipients=users.filter(user=>insured(user,new Date())).map(user=>({id:user.id,message:digestMessage(user,jobs)}));
    const cursor=users[users.length-1].id;
    if(!recipients.length){run=await prisma.jobDigestRun.update({where:{id},data:{cursor}});continue;}
    pending={key:`job-digest-${id}-${randomUUID()}`,cursor,createdAt:new Date().toISOString(),jobIds:jobs.map(job=>job.id),recipients};
    // Persist the exact batch before sending so a timeout/restart can retry the same
    // Resend idempotency key and payload instead of generating duplicate emails.
    run=await prisma.jobDigestRun.update({where:{id},data:{pending:pending as unknown as Prisma.InputJsonValue}});
   }
   const liveUsers=await prisma.user.findMany({where:{...eligibleWhere,id:{in:pending.recipients.map(item=>item.id)}},select:recipientSelect});
   const liveJobs=await prisma.transportJob.count({where:{...openQuoteRequestsWhere(),id:{in:pending.jobIds}}});
   const allowed=new Map(liveUsers.filter(user=>insured(user,new Date())).map(user=>[user.id,user.email]));
   // Never retry a stale payload, or send a pending batch after an opt-out/account
   // change. Drop that batch conservatively, rather than risk resending an accepted
   // request with a different payload/key after an ambiguous provider timeout.
   const unsafe=Date.now()-new Date(pending.createdAt).getTime()>=23*60*60*1000||liveJobs!==pending.jobIds.length||pending.recipients.some(item=>allowed.get(item.id)!==item.message.to);
   if(unsafe){
    run=await prisma.jobDigestRun.update({where:{id},data:{cursor:pending.cursor,pending:Prisma.DbNull,skippedCount:{increment:pending.recipients.length}}});
    continue;
   }
   const result=await sendTransactionalEmailBatch(pending.recipients.map(item=>item.message),pending.key);
   if(!result.sent)return {state:'disabled',sent};
   sent+=result.count;
   run=await prisma.jobDigestRun.update({where:{id},data:{cursor:pending.cursor,pending:Prisma.DbNull,sentCount:{increment:result.count}}});
   // Resend's batch endpoint accepts 100 recipients. Pace requests, not recipients.
   await new Promise(resolve=>setTimeout(resolve,650));
  }
  return {state:'more',sent};
 }finally{
  await prisma.jobDigestRun.updateMany({where:{id,leaseToken:token},data:{leaseToken:null,leaseUntil:null}});
  await prisma.jobDigestRun.deleteMany({where:{createdAt:{lt:new Date(now.getTime()-30*DAY)}}});
 }
}
