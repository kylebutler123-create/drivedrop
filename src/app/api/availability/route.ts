import {after,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {apiError,parseJson} from '@/lib/api';
import {respondToRequest,lockJob,closeExpired} from '@/lib/availability';
import {notifyAvailability} from '@/lib/availability-notifications';
import {calculateCustomerPrice} from '@/lib/finance';
export const dynamic='force-dynamic';
export async function GET(){try{
 const u=await currentUser();if(!u||!['CUSTOMER','TRANSPORTER'].includes(u.role))return NextResponse.json({error:'Login required'},{status:403});
 const owner=u.role==='CUSTOMER'?{customerId:u.id}:{transporterId:u.id};
 const pending=await prisma.availabilityRequest.findMany({where:{...owner,activeJobId:{not:null}},select:{id:true,jobId:true}});
 const ended:string[]=[];
 for(const r of pending)await prisma.$transaction(async tx=>{await lockJob(tx,r.jobId);if((await closeExpired(tx,r.jobId,new Date())).count)ended.push(r.id);});
 if(ended.length)after(async()=>{for(const id of ended)await notifyAvailability(id);});
 const rows=await prisma.availabilityRequest.findMany({where:owner,include:{job:{select:{vehicleMake:true,vehicleModel:true,collection:true,delivery:true,running:true,status:true}}},orderBy:{createdAt:'desc'},take:100});
 const ids=[...new Set(rows.flatMap(r=>[r.customerId,r.transporterId]))];
 const users=await prisma.user.findMany({where:{id:{in:ids}},select:{id:true,name:true}});
 return NextResponse.json(rows.map(r=>({...r,customerName:users.find(u=>u.id===r.customerId)?.name,transporterName:users.find(u=>u.id===r.transporterId)?.name,customerTotalPence:calculateCustomerPrice(r.pricePence).customerTotalPence})),{headers:{'Cache-Control':'no-store'}});
}catch(e){return apiError(e,'Unable to load confirmation requests');}}
const S=z.object({requestId:z.string().min(1),action:z.enum(['CONFIRM','DECLINE','WITHDRAW']),travelMinutes:z.number().int().min(30).max(1440).optional()});
export async function PATCH(r:Request){try{const u=await currentUser();if(!u)return NextResponse.json({error:'Login required'},{status:403});const d=await parseJson(r,S);const result=await respondToRequest(u,d.requestId,d.action,d.travelMinutes);if(result.changed)after(()=>notifyAvailability(result.request.id));return NextResponse.json(result.request);}catch(e){return apiError(e,'Unable to update confirmation request');}}
