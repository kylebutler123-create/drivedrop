import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {currentUser,clearSession} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {sendTransactionalEmailSafely} from '@/lib/email';

const Schema=z.object({password:z.string().min(1),confirmation:z.literal('CLOSE')});

async function blockers(userId:string){
  const [liveJobs,activeCustomerBookings,activeTransporterBookings,openDisputes,unsettledTransporterPayments]=await Promise.all([
    prisma.transportJob.count({where:{customerId:userId,status:{in:['OPEN','QUOTED','BOOKED']}}}),
    prisma.booking.count({where:{customerId:userId,status:{notIn:['DELIVERED','CANCELLED']}}}),
    prisma.booking.count({where:{transporterId:userId,status:{notIn:['DELIVERED','CANCELLED']}}}),
    prisma.dispute.count({where:{raisedById:userId,status:{in:['OPEN','UNDER_REVIEW']}}}),
    prisma.bookingPayment.count({where:{booking:{transporterId:userId},payoutStatus:{in:['READY','HELD']}}})
  ]);
  return {liveJobs,activeBookings:activeCustomerBookings+activeTransporterBookings,openDisputes,unsettledTransporterPayments};
}

export async function GET(){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  const result=await blockers(user.id);
  return NextResponse.json({canClose:Object.values(result).every(v=>v===0),blockers:result});
}

export async function POST(request:Request){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  const parsed=Schema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:'Enter your password and type CLOSE to continue.'},{status:400});
  const fresh=await prisma.user.findUnique({where:{id:user.id},select:{email:true,passwordHash:true,accountStatus:true}});
  if(!fresh||fresh.accountStatus!=='ACTIVE')return NextResponse.json({error:'This account cannot be closed.'},{status:400});
  if(!(await bcrypt.compare(parsed.data.password,fresh.passwordHash)))return NextResponse.json({error:'Current password is incorrect.'},{status:401});
  const result=await blockers(user.id);
  if(Object.values(result).some(v=>v>0))return NextResponse.json({error:'Your account still has active work, bookings, disputes or unsettled payouts.',blockers:result},{status:409});

  await prisma.$transaction([
    prisma.user.update({where:{id:user.id},data:{accountStatus:'DELETED',workRestricted:true}}),
    prisma.session.deleteMany({where:{userId:user.id}})
  ]);
  await sendTransactionalEmailSafely({to:fresh.email,subject:'Your DriveDrop account has been closed',heading:'Account closed',body:'Your DriveDrop account has been closed and can no longer be used to sign in. If you did not request this, please contact DriveDrop support.'});
  await clearSession();
  return NextResponse.json({ok:true});
}
