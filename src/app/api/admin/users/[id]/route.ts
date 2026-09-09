import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {createNotificationSafely} from '@/lib/notifications';
import {z} from 'zod';

const S=z.object({action:z.enum(['SUSPEND','REACTIVATE','RESTRICT_WORK','RESTORE_WORK','SAVE_NOTE','DELETE']),note:z.string().max(1000).optional()});

async function supportConversationHref(userId:string){
 const conversation=await prisma.supportConversation.upsert({where:{userId},update:{},create:{userId},select:{id:true}});
 return `/messages?bookingId=${encodeURIComponent(`support:${conversation.id}`)}`;
}

export async function PATCH(r:Request,{params}:{params:Promise<{id:string}>}){
 const admin=await currentUser(); if(!admin||admin.role!=='ADMIN')return NextResponse.json({error:'Forbidden'},{status:403});
 const {id}=await params; if(id===admin.id)return NextResponse.json({error:'You cannot change your own administrator account here.'},{status:400});
 const target=await prisma.user.findUnique({where:{id}}); if(!target)return NextResponse.json({error:'Account not found'},{status:404});
 if(target.role==='ADMIN')return NextResponse.json({error:'Administrator accounts cannot be changed from user management.'},{status:400});
 const d=S.parse(await r.json());
 const note=d.note?.trim()||'';
 if((d.action==='SUSPEND'||d.action==='RESTRICT_WORK'||d.action==='DELETE')&&!note)return NextResponse.json({error:'An internal admin reason is required for this action.'},{status:400});
 if((d.action==='RESTRICT_WORK'||d.action==='RESTORE_WORK')&&target.role!=='TRANSPORTER')return NextResponse.json({error:'Work restrictions only apply to transporters.'},{status:400});
 if(d.action==='SUSPEND'){await prisma.$transaction([prisma.user.update({where:{id},data:{accountStatus:'SUSPENDED',adminNote:note}}),prisma.session.deleteMany({where:{userId:id}})]);}
 if(d.action==='REACTIVATE')await prisma.user.update({where:{id},data:{accountStatus:'ACTIVE'}});
 if(d.action==='RESTRICT_WORK'){
  await prisma.user.update({where:{id},data:{workRestricted:true,adminNote:note}});
  if(!target.workRestricted)await createNotificationSafely({
   userId:id,
   type:'ACCOUNT',
   title:'New work access restricted',
   body:'DriveDrop has restricted your transporter account from accepting new transport work. You can continue managing existing deliveries. Contact DriveDrop Support if you need help.',
   href:await supportConversationHref(id)
  });
 }
 if(d.action==='RESTORE_WORK'){
  await prisma.user.update({where:{id},data:{workRestricted:false}});
  if(target.workRestricted)await createNotificationSafely({
   userId:id,
   type:'ACCOUNT',
   title:'New work access restored',
   body:'DriveDrop has restored your transporter work access. You can now view available jobs and submit quotes again. Contact DriveDrop Support if you need help.',
   href:await supportConversationHref(id)
  });
 }
 if(d.action==='SAVE_NOTE')await prisma.user.update({where:{id},data:{adminNote:note||null}});
 if(d.action==='DELETE'){
   const activeBookings=await prisma.booking.count({where:{OR:[{customerId:id},{transporterId:id}],status:{notIn:['DELIVERED','CANCELLED']}}});
   if(activeBookings)return NextResponse.json({error:'This account has an active delivery and cannot be removed.'},{status:409});
   await prisma.$transaction([prisma.user.update({where:{id},data:{accountStatus:'DELETED',workRestricted:true,name:'Deleted account',email:`deleted-${id}@drivedrop.invalid`,adminNote:note}}),prisma.session.deleteMany({where:{userId:id}})]);
 }
 return NextResponse.json({ok:true});
}
