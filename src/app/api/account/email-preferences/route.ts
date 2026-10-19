import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';

const schema=z.object({dailyJobEmails:z.boolean()}).strict();

export async function PUT(request:Request){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 if(user.role!=='TRANSPORTER'||user.accountStatus!=='ACTIVE')return NextResponse.json({error:'An active transporter account is required'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Choose Daily summary or Off.'},{status:400});
 const updated=await prisma.user.update({where:{id:user.id},data:parsed.data,select:{dailyJobEmails:true}});
 return NextResponse.json(updated,{headers:{'Cache-Control':'no-store'}});
}
