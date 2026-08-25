import { NextResponse } from 'next/server';import { prisma } from '@/lib/prisma';import { currentUser } from '@/lib/auth';import { z } from 'zod';import {apiError,parseJson} from '@/lib/api'
const S=z.object({jobId:z.string().min(1),pricePence:z.number().int().min(1000).max(10_000_000),message:z.string().trim().max(1000).optional()})
export async function POST(r:Request){
 try{const u=await currentUser();if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter login required'},{status:403});const d=await parseJson(r,S);
 const q=await prisma.$transaction(async tx=>{const job=await tx.transportJob.findUnique({where:{id:d.jobId}});if(!job)throw new Error('Not found');if(!['OPEN','QUOTED'].includes(job.status))throw new Error('Job is no longer accepting quotes');const existing=await tx.quote.findFirst({where:{jobId:d.jobId,transporterId:u.id}});if(existing)throw new Error('You have already quoted this job');const q=await tx.quote.create({data:{...d,transporterId:u.id}});if(job.status==='OPEN')await tx.transportJob.update({where:{id:d.jobId},data:{status:'QUOTED'}});return q});return NextResponse.json(q,{status:201})
 }catch(e){return apiError(e,'Unable to submit quote')}
}
