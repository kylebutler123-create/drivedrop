import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/auth';
import {createEvidenceStoragePath,uploadEvidenceFile,validateEvidenceFile} from '@/lib/supabase-storage';
import {createNotificationSafely} from '@/lib/notifications';
import {sendTransactionalEmailSafely} from '@/lib/email';

const SIGNATURE_MARKER='__POD_SIGNATURE__';

export async function POST(r:Request){
 const u=await currentUser();
 if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
 const form=await r.formData();
 const bookingId=String(form.get('bookingId')||'');
 const recipientName=String(form.get('recipientName')||'').trim();
 const notes=String(form.get('notes')||'').trim();
 const confirmed=String(form.get('confirmed')||'')==='true';
 const signature=form.get('signature');
 const photos=form.getAll('photos').filter((x):x is File=>x instanceof File&&x.size>0);
 if(!bookingId)return NextResponse.json({error:'Booking is required'},{status:400});
 if(recipientName.length<2||recipientName.length>120)return NextResponse.json({error:'Enter the name of the person who received the vehicle'},{status:400});
 if(notes.length>1000)return NextResponse.json({error:'Delivery notes must be 1000 characters or fewer'},{status:400});
 if(!confirmed)return NextResponse.json({error:'Confirm that the vehicle has been delivered'},{status:400});
 if(!(signature instanceof File)||signature.size<=0)return NextResponse.json({error:'Recipient signature is required'},{status:400});
 if(photos.length<1)return NextResponse.json({error:'Add at least one delivery photo'},{status:400});
 if(photos.length>6)return NextResponse.json({error:'You can upload up to 6 delivery photos'},{status:400});

 const booking=await prisma.booking.findFirst({where:{id:bookingId,transporterId:u.id},include:{payment:true,job:true,customer:{select:{name:true,email:true}}}});
 if(!booking)return NextResponse.json({error:'Booking not found'},{status:404});
 if(!['IN_TRANSIT','ARRIVING_SOON'].includes(booking.status))return NextResponse.json({error:'Proof of delivery can only be submitted when the vehicle is in transit or arriving soon'},{status:400});
 if(!booking.payment||booking.payment.status!=='PAID'||booking.payment.paidPence<booking.payment.depositPence)return NextResponse.json({error:'Customer payment must be secured before delivery can be completed'},{status:400});

 const signatureValidation=await validateEvidenceFile(signature);
 if(!signatureValidation.ok)return NextResponse.json({error:`Signature: ${signatureValidation.error}`},{status:400});
 const photoValidations=[] as {file:File,extension:string}[];
 for(const photo of photos){const v=await validateEvidenceFile(photo);if(!v.ok)return NextResponse.json({error:`Delivery photo: ${v.error}`},{status:400});photoValidations.push({file:photo,extension:v.extension});}

 try{
  const uploadedPhotos=[] as string[];
  for(const item of photoValidations){const path=createEvidenceStoragePath(booking.id,u.id,item.extension);await uploadEvidenceFile(path,item.file);uploadedPhotos.push(path);}
  const signaturePath=createEvidenceStoragePath(booking.id,u.id,signatureValidation.extension);await uploadEvidenceFile(signaturePath,signature);
  const submittedAt=new Date();
  await prisma.$transaction(async(tx:any)=>{
   for(const path of uploadedPhotos)await tx.evidence.create({data:{bookingId:booking.id,uploaderId:u.id,type:'DELIVERY',imageUrl:path,note:'Proof of delivery photo'}});
   await tx.evidence.create({data:{bookingId:booking.id,uploaderId:u.id,type:'DELIVERY',imageUrl:signaturePath,note:SIGNATURE_MARKER}});
   await tx.$executeRaw`UPDATE "Booking" SET "podRecipientName"=${recipientName}, "podNotes"=${notes||null}, "podSubmittedAt"=${submittedAt}, "status"='DELIVERED'::"BookingStatus" WHERE "id"=${booking.id}`;
   await tx.transportJob.update({where:{id:booking.jobId},data:{status:'COMPLETED'}});
   await tx.trackingEvent.create({data:{bookingId:booking.id,status:'DELIVERED',note:notes||`Proof of delivery signed by ${recipientName}`,actorId:u.id}});
  });
  const vehicle=[(booking.job as any).vehicleYear,booking.job.vehicleMake,booking.job.vehicleModel].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()||'vehicle';
  await createNotificationSafely({userId:booking.customerId,type:'DELIVERY',title:'Vehicle delivered',body:`${vehicle}: proof of delivery has been submitted and the delivery is complete.`,href:'/customer'});
  await sendTransactionalEmailSafely({to:booking.customer.email,subject:`Your ${vehicle} has been delivered`,heading:'Vehicle delivered',preheader:'Proof of delivery is now available in your DriveDrop account.',body:`Hi ${booking.customer.name?.trim()||'there'},\n\nYour transporter has completed the delivery of your ${vehicle}. Proof of delivery, including the recipient signature and delivery photos, is securely stored with the booking.`,ctaLabel:'View delivery',ctaPath:'/customer'});
  return NextResponse.json({ok:true,submittedAt});
 }catch(e){console.error('Proof of delivery submission failed',e);return NextResponse.json({error:'Unable to submit proof of delivery right now'},{status:500})}
}
