import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';

export const dynamic='force-dynamic';
export const revalidate=0;
const Patch=z.object({id:z.string().optional(),all:z.boolean().optional()});

type Row={id:string;type:string;title:string;body:string;href:string|null;readAt:Date|null;createdAt:Date};

export async function GET(){
 const u=await currentUser();
 if(!u)return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store, max-age=0'}});
 const rows=await prisma.$queryRaw<Row[]>`
  SELECT "id","type","title","body","href","readAt","createdAt"
  FROM "Notification"
  WHERE "userId"=${u.id}
  ORDER BY "createdAt" DESC
  LIMIT 100
 `;
 const unread=rows.filter(n=>!n.readAt).length;
 return NextResponse.json({notifications:rows,unread},{headers:{'Cache-Control':'no-store, max-age=0'}});
}

export async function PATCH(r:Request){
 const u=await currentUser();
 if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 const parsed=Patch.safeParse(await r.json());
 if(!parsed.success)return NextResponse.json({error:'Invalid request'},{status:400});
 if(parsed.data.all){
  await prisma.$executeRaw`UPDATE "Notification" SET "readAt"=COALESCE("readAt",NOW()) WHERE "userId"=${u.id}`;
 }else if(parsed.data.id){
  await prisma.$executeRaw`UPDATE "Notification" SET "readAt"=COALESCE("readAt",NOW()) WHERE "id"=${parsed.data.id} AND "userId"=${u.id}`;
 }else return NextResponse.json({error:'Notification is required'},{status:400});
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
