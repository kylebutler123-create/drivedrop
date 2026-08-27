import {NextResponse} from 'next/server';import {prisma} from '@/lib/prisma';import {currentUser} from '@/lib/auth';import {z} from 'zod';import {createEvidenceStoragePath,uploadEvidenceFile,validateEvidenceFile} from '@/lib/supabase-storage';
const metadata=z.object({bookingId:z.string().min(1),type:z.enum(['COLLECTION','DELIVERY']),note:z.string().max(500).optional()});
export async function POST(r:Request){
 const u=await currentUser();if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
 const form=await r.formData();const file=form.get('file');if(!(file instanceof File))return NextResponse.json({error:'Choose a photo to upload'},{status:400});
 const x=metadata.safeParse({bookingId:String(form.get('bookingId')||''),type:form.get('type'),note:String(form.get('note')||'')||undefined});if(!x.success)return NextResponse.json({error:'Invalid evidence details'},{status:400});
 const validation=validateEvidenceFile(file);if(!validation.ok)return NextResponse.json({error:validation.error},{status:400});
 const b=await prisma.booking.findFirst({where:{id:x.data.bookingId,transporterId:u.id}});if(!b)return NextResponse.json({error:'Forbidden'},{status:403});
 const path=createEvidenceStoragePath(b.id,u.id,validation.extension);
 try{await uploadEvidenceFile(path,file);const evidence=await prisma.evidence.create({data:{bookingId:b.id,uploaderId:u.id,type:x.data.type,imageUrl:path,note:x.data.note}});return NextResponse.json({id:evidence.id,type:evidence.type,note:evidence.note,createdAt:evidence.createdAt},{status:201})}catch(e){console.error('Evidence upload failed',e);return NextResponse.json({error:'Unable to upload photo right now'},{status:500})}
}
