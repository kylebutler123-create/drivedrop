import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {z} from 'zod';

const S=z.object({action:z.enum(['SUSPEND','REACTIVATE','RESTRICT_WORK','RESTORE_WORK','SAVE_NOTE','DELETE']),note:z.string().max(1000).optional()});

export async function PATCH(r:Request,{params}:{params:Promise<{id:string}>}){
 const admin=await currentUser(); if(!admin||admin.role!=='ADMIN')return NextResponse.json({error:'Forbidden'},{status:403});
 const {id}=await params; if(id===admin.id)return NextResponse.json({error:'You cannot change your own administrator account here.'},{status:400});
 const target=await prisma.user.findUnique({where:{id}}); if(!target)return NextResponse.json({error:'Account not found'},{status:404});
 if(target.role==='ADMIN')return NextResponse.json({error:'Administrator accounts cannot be changed from user management.'},{status:400});
 const d=S.parse(await r.json());
 if((d.action==='RESTRICT_WORK'||d.action==='RESTORE_WORK')&&target.role!=='TRANSPORTER')return NextResponse.json({error:'Work restrictions only apply to transporters.'},{status:400});
 if(d.action==='SUSPEND'){await prisma.$transaction([prisma.user.update({where:{id},data:{accountStatus:'SUSPENDED'}}),prisma.session.deleteMany({where:{userId:id}})]);}
 if(d.action==='REACTIVATE')await prisma.user.update({where:{id},data:{accountStatus:'ACTIVE'}});
 if(d.action==='RESTRICT_WORK')await prisma.user.update({where:{id},data:{workRestricted:true}});
 if(d.action==='RESTORE_WORK')await prisma.user.update({where:{id},data:{workRestricted:false}});
 if(d.action==='SAVE_NOTE')await prisma.user.update({where:{id},data:{adminNote:d.note?.trim()||null}});
 if(d.action==='DELETE'){
   const activeBookings=await prisma.booking.count({where:{OR:[{customerId:id},{transporterId:id}],status:{notIn:['DELIVERED','CANCELLED']}}});
   if(activeBookings)return NextResponse.json({error:'This account has an active delivery and cannot be removed.'},{status:409});
   await prisma.$transaction([prisma.user.update({where:{id},data:{accountStatus:'DELETED',workRestricted:true,name:'Deleted account',email:`deleted-${id}@drivedrop.invalid`,adminNote:d.note?.trim()||'Account removed by administrator'}}),prisma.session.deleteMany({where:{userId:id}})]);
 }
 return NextResponse.json({ok:true});
}
