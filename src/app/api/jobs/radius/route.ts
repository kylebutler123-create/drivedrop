import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {z} from 'zod';
import {collectionMiles,collectionPostcode,fullPostcode,jobOriginSchema,postcodePoint,resolveJobOrigin,type JobPoint} from '@/lib/job-locations';

const S=z.object({postcode:z.string().trim().regex(fullPostcode).optional(),origin:jobOriginSchema.optional(),jobs:z.array(z.object({id:z.string().min(1).max(150),collection:z.string().min(1).max(1000)})).max(200)}).refine(value=>!!value.origin||!!value.postcode);
export async function POST(request:Request){
 const user=await currentUser();
 if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter login required'},{status:403});
 const parsed=S.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Choose a UK town, city or postcode and try again.'},{status:400});
 try{
  const body=parsed.data;
  const origin=await resolveJobOrigin(body.origin||{kind:'postcode',postcode:body.postcode!});
  const unique=Array.from(new Set(body.jobs.map(job=>job.collection.match(collectionPostcode)?.[1]?.replace(/\s/g,'').toUpperCase()).filter((p):p is string=>!!p)));
  const locations=new Map<string,JobPoint>();
  // Bound provider concurrency and look up each collection postcode once.
  for(let start=0;start<unique.length;start+=8)await Promise.all(unique.slice(start,start+8).map(async postcode=>{try{locations.set(postcode,await postcodePoint(postcode))}catch{}}));
  if(unique.length&&!locations.size)throw new Error('Collection distances could not be checked. Please try again.');
  const distances=body.jobs.map(job=>{const postcode=job.collection.match(collectionPostcode)?.[1]?.replace(/\s/g,'').toUpperCase();const point=postcode?locations.get(postcode):null;return {id:job.id,miles:point?collectionMiles(origin.point,point):null}});
  return NextResponse.json({origin:origin.label,point:origin.point,distances,unlocatedCount:distances.filter(item=>item.miles===null).length});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to calculate collection distances. Please try again.'},{status:503})}
}
