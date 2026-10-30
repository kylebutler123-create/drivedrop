import {NextRequest,NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {customerPhotoHeaders,readCustomerPhoto} from '@/lib/customer-photo-storage';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:NextRequest){
 const user=await currentUser();
 if(!user||user.role!=='TRANSPORTER'||user.accountStatus!=='ACTIVE')return new NextResponse(null,{status:403,headers:customerPhotoHeaders});
 const id=request.nextUrl.searchParams.get('bookingId');
 if(!id||id.length>128)return new NextResponse(null,{status:400,headers:customerPhotoHeaders});
 const booking=await prisma.booking.findFirst({
  where:{id,transporterId:user.id,status:{in:['CONFIRMED','COLLECTION_SCHEDULED','COLLECTED','IN_TRANSIT','ARRIVING_SOON']},customer:{accountStatus:'ACTIVE'}},
  select:{customerId:true},
 });
 if(!booking)return new NextResponse(null,{status:404,headers:customerPhotoHeaders});
 return readCustomerPhoto(booking.customerId);
}
