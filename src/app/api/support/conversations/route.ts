import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';

const S=z.object({userId:z.string().min(1)});

export async function POST(r:Request){
 const admin=await currentUser();
 if(!admin||admin.role!=='ADMIN')return NextResponse.json({error:'Administrator login required'},{status:403});
 const parsed=S.safeParse(await r.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'A valid user is required'},{status:400});
 const target=await prisma.user.findFirst({where:{id:parsed.data.userId,role:{not:'ADMIN'},accountStatus:{not:'DELETED'}},select:{id:true}});
 if(!target)return NextResponse.json({error:'This user is not available for messaging'},{status:404});
 const conversation=await prisma.supportConversation.upsert({where:{userId:target.id},update:{},create:{userId:target.id},select:{id:true,userId:true}});
 return NextResponse.json(conversation,{headers:{'Cache-Control':'no-store, max-age=0'}});
}
