import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
 const user=await currentUser();
 if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store, max-age=0'}});
 const count=await prisma.booking.count({where:{transporterId:user.id,status:'DELIVERED'}});
 return NextResponse.json({count},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
