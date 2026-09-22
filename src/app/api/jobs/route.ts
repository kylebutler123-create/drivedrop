import {vehicleTypes} from '@/lib/vehicle-types';
import {transportTypeDisplay,transportTypeValues} from '@/lib/transport-types';
import {after,NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';
import {quoteRequestExpiryCutoff} from '@/lib/job-expiry';
import {sendTransactionalEmailBatchSafely} from '@/lib/email';
import {insuranceStatusForVerification} from '@/lib/insurance-expiry-notifications';


const S=z.object({collection:z.string().min(2),delivery:z.string().min(2),transportType:z.enum(transportTypeValues).default('ANY'),vehicleType:z.enum(vehicleTypes),vehicleMake:z.string().min(1),vehicleModel:z.string().min(1),registration:z.string().optional(),running:z.boolean().default(true),collectionDate:z.coerce.date()});

export async function POST(r:Request){
 const u=await currentUser();
 if(!u||u.role!=='CUSTOMER')return NextResponse.json({error:'Customer login required'},{status:403});
 const d=S.parse(await r.json());
 const {vehicleType,...jobData}=d;
 const job=await prisma.transportJob.create({data:{...jobData,customerId:u.id}});
 await prisma.$executeRaw`UPDATE "TransportJob" SET "vehicleType"=${vehicleType} WHERE "id"=${job.id}`;

 after(async()=>{
  try{
   const transporters=await prisma.user.findMany({
    where:{role:'TRANSPORTER',accountStatus:'ACTIVE',workRestricted:false,transporterVerification:{is:{status:'APPROVED'}}},
    select:{email:true,name:true,transporterVerification:{select:{id:true,status:true,reviewedAt:true,documents:{where:{type:'INSURANCE',status:{not:'REJECTED'}},select:{id:true,type:true,status:true,expiresAt:true,createdAt:true},orderBy:{createdAt:'desc'}}}}},
   });
   const eligible=transporters.filter(transporter=>{
    const verification=transporter.transporterVerification;
    if(!verification)return false;
    const insurance=insuranceStatusForVerification(verification);
    return insurance.state!=='MISSING'&&insurance.state!=='EXPIRED';
   });
   const vehicle=`${vehicleType}: ${d.vehicleMake} ${d.vehicleModel}`.replace(/\s+/g,' ').trim();
   const collectionDate=d.collectionDate.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'});
   await sendTransactionalEmailBatchSafely(eligible.map(transporter=>({
    to:transporter.email,
    subject:`New ${vehicleType.toLowerCase()} transport job available`,
    heading:'New transport job available',
    preheader:`${vehicle} — ${d.collection} to ${d.delivery}`,
    body:`Hi ${transporter.name?.trim()||'there'},\n\nA new customer transport request is now available for quotes.\n\nVehicle: ${vehicle}\nTransport type: ${transportTypeDisplay(d.transportType)}\nCollection: ${d.collection}\nDelivery: ${d.delivery}\nCollection date: ${collectionDate}\n\nSign in to review the full job details and submit a quote.`,
    ctaLabel:'View available jobs',
    ctaPath:'/transporter',
   })),`new-job-${job.id}`);
  }catch(error){
   console.error('New available job email notification failed',{jobId:job.id,error});
  }
 });

 return NextResponse.json({...job,vehicleType},{status:201});
}

export async function GET(){
 const u=await currentUser();
 if(!u||!['TRANSPORTER','ADMIN'].includes(u.role))return NextResponse.json({error:'Forbidden'},{status:403});
 const jobs=await prisma.transportJob.findMany({where:{status:{in:['OPEN','QUOTED']},createdAt:{gte:quoteRequestExpiryCutoff()}},include:{quotes:{where:u.role==='TRANSPORTER'?{transporterId:u.id,status:'PENDING'}:undefined,select:{id:true,pricePence:true,status:true,transporterId:true,proposedCollectionDate:true,dateNegotiationStatus:true,message:true}},customer:{select:{name:true}}},orderBy:{createdAt:'desc'}});
 const ids=jobs.map(j=>j.id);
 const rows=ids.length?await prisma.$queryRawUnsafe<Array<{id:string;vehicleType:string|null}>>(`SELECT "id", "vehicleType" FROM "TransportJob" WHERE "id" IN (${ids.map((_,i)=>`$${i+1}`).join(',')})`,...ids):[];
 const types=new Map(rows.map(r=>[r.id,r.vehicleType]));
 return NextResponse.json(jobs.map(j=>({...j,vehicleType:types.get(j.id)||null})));
}
