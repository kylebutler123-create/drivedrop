import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(){
  const u=await currentUser();
  if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Forbidden'},{status:403,headers:{'Cache-Control':'no-store, max-age=0'}});

  const quotes=await prisma.quote.findMany({
    where:{transporterId:u.id},
    include:{
      job:{select:{
        id:true,status:true,vehicleMake:true,vehicleModel:true,collection:true,delivery:true,collectionDate:true,
        customer:{select:{name:true}},
        _count:{select:{quotes:{where:{status:{not:'WITHDRAWN'}}}}}
      }},
      booking:{select:{id:true,status:true,customerConfirmedAt:true}}
    },
    orderBy:{createdAt:'desc'}
  });

  const ids=[...new Set(quotes.map(q=>q.job.id))];
  const vehicleRows=ids.length?await prisma.$queryRawUnsafe<Array<{id:string;vehicleType:string|null}>>(`SELECT "id", "vehicleType" FROM "TransportJob" WHERE "id" IN (${ids.map((_,i)=>`$${i+1}`).join(',')})`,...ids):[];
  const types=new Map(vehicleRows.map(row=>[row.id,row.vehicleType]));
  return NextResponse.json(quotes.map(q=>({...q,job:{...q.job,vehicleType:types.get(q.job.id)||null}})),{headers:{'Cache-Control':'no-store, max-age=0'}});
}
