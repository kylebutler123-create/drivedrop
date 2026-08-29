import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';

const Schema=z.object({name:z.string().trim().min(2).max(100)});

export async function PUT(request:Request){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  const parsed=Schema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:'Please enter a valid name'},{status:400});
  const updated=await prisma.user.update({where:{id:user.id},data:{name:parsed.data.name},select:{name:true,email:true}});
  return NextResponse.json(updated);
}
