import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {downloadMessageImage} from '@/lib/supabase-storage';

export async function GET(_r:Request,context:{params:Promise<{id:string}>}){
 const u=await currentUser();if(!u)return NextResponse.json({error:'Authentication required'},{status:401});
 const{id}=await context.params;
 const rows=await prisma.$queryRaw<Array<{storagePath:string,mimeType:string,customerId:string,transporterId:string}>>`
  SELECT a."storagePath",a."mimeType",b."customerId",b."transporterId"
  FROM "MessageAttachment" a
  JOIN "Message" m ON m."id"=a."messageId"
  JOIN "Booking" b ON b."id"=m."bookingId"
  WHERE a."id"=${id}
  LIMIT 1`;
 const item=rows[0];if(!item)return NextResponse.json({error:'Image not found'},{status:404});
 if(u.role!=='ADMIN'&&item.customerId!==u.id&&item.transporterId!==u.id)return NextResponse.json({error:'Access denied'},{status:403});
 const stored=await downloadMessageImage(item.storagePath);if(!stored.ok||!stored.body)return NextResponse.json({error:'Unable to retrieve image'},{status:502});
 const h=new Headers();h.set('Content-Type',item.mimeType||stored.headers.get('content-type')||'application/octet-stream');h.set('Cache-Control','private, no-store');h.set('Content-Disposition','inline');h.set('X-Content-Type-Options','nosniff');return new Response(stored.body,{status:200,headers:h});
}
