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
        customer:{select:{name:true}}
      }},
      booking:{select:{id:true,status:true,customerConfirmedAt:true}}
    },
    orderBy:{createdAt:'desc'}
  });

  return NextResponse.json(quotes,{headers:{'Cache-Control':'no-store, max-age=0'}});
}
