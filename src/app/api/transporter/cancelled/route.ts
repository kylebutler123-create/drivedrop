import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';

export const dynamic='force-dynamic';
export const revalidate=0;
const headers={'Cache-Control':'no-store, max-age=0'};

export async function GET(){
 const user=await currentUser();
 if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Unauthorized'},{status:401,headers});
 try{
  const rows=await prisma.booking.findMany({
   where:{transporterId:user.id,status:'CANCELLED'},
   select:{
    id:true,createdAt:true,
    job:{select:{id:true,vehicleMake:true,vehicleModel:true,collection:true,delivery:true,registration:true,running:true,transportType:true,collectionDate:true}},
    customer:{select:{name:true}},
    trackingEvents:{where:{status:'CANCELLED'},select:{createdAt:true,note:true},orderBy:{createdAt:'desc'},take:1}
   },
   orderBy:{createdAt:'desc'}
  });
  const ids=[...new Set(rows.map(row=>row.job.id))];
  const vehicleRows=ids.length?await prisma.$queryRawUnsafe<Array<{id:string;vehicleType:string|null}>>(`SELECT "id", "vehicleType" FROM "TransportJob" WHERE "id" IN (${ids.map((_,i)=>`$${i+1}`).join(',')})`,...ids):[];
  const types=new Map(vehicleRows.map(row=>[row.id,row.vehicleType]));
  const bookings=rows.map(({trackingEvents,...booking})=>({
   ...booking,job:{...booking.job,vehicleType:types.get(booking.job.id)||null},cancelledAt:trackingEvents[0]?.createdAt??null,cancellationNote:trackingEvents[0]?.note??null
  })).sort((a,b)=>(b.cancelledAt?.getTime()??0)-(a.cancelledAt?.getTime()??0));
  return NextResponse.json({bookings},{headers});
 }catch{
  return NextResponse.json({error:'Unable to load cancelled deliveries.'},{status:500,headers});
 }
}
