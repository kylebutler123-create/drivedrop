import {prisma} from './prisma';
import {profileImageUrl} from './supabase-storage';

/** Call with the signed-in transporter or IDs from already-authorized bookings. */
export async function transporterPhotoUrls(transporterIds:string[]){
 const ids=[...new Set(transporterIds)].filter(Boolean);
 if(!ids.length)return new Map<string,string|null>();
 try{
  const rows=await prisma.$queryRawUnsafe<Array<{transporterId:string;transporterPhotoPath:string|null}>>(
   `SELECT "transporterId", "transporterPhotoPath" FROM "TransporterVerification" WHERE "transporterId" IN (${ids.map((_,i)=>`$${i+1}`).join(',')})`,...ids);
  return new Map(rows.map(row=>[row.transporterId,profileImageUrl(row.transporterPhotoPath)]));
 }catch(error){
  console.error('Unable to load transporter photos',error);
  return new Map<string,string|null>();
 }
}
