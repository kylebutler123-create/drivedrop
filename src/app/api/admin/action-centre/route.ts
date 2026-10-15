import {adminPayoutCounts} from '@/lib/admin-payout-counts';
import {NextResponse} from 'next/server';import {currentUser} from '@/lib/auth';import {prisma} from '@/lib/prisma';
export const dynamic='force-dynamic';export const revalidate=0;
export async function GET(){const u=await currentUser();if(!u||u.role!=='ADMIN')return NextResponse.json({error:'Admin required'},{status:403});const[pendingVerification,openDisputes,payoutCounts]=await Promise.all([prisma.transporterVerification.count({where:{status:'PENDING'}}),prisma.dispute.count({where:{status:{in:['OPEN','UNDER_REVIEW']}}}),adminPayoutCounts()]);return NextResponse.json({pendingVerification,openDisputes,...payoutCounts},{headers:{'Cache-Control':'no-store, max-age=0'}})}
