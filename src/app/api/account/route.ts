import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';

const Phone=z.string().trim().min(7).max(30).regex(/^[0-9+() .-]+$/);
const Schema=z.object({name:z.string().trim().min(2).max(100),phone:z.union([Phone,z.literal(''),z.null()]).optional()});

export async function PUT(request:Request){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  const parsed=Schema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:'Please enter a valid name and phone number'},{status:400});
  const updated=await prisma.user.update({
    where:{id:user.id},
    data:{name:parsed.data.name,...(user.role==='CUSTOMER'?{phone:parsed.data.phone||null}:{})},
    select:{name:true,email:true,phone:true}
  });
  return NextResponse.json(updated);
}
