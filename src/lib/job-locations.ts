import {z} from 'zod';

export const fullPostcode=/^(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i;
export const collectionPostcode=/\b(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;
export const formatPostcode=(value:string)=>value.toUpperCase().replace(/\s/g,'').replace(/(.+)(.{3})$/,'$1 $2');
export const pointSchema=z.object({lat:z.number().finite().min(49).max(61),lon:z.number().finite().min(-9).max(2)});
export const jobOriginSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('postcode'),postcode:z.string().trim().regex(fullPostcode)}),
 z.object({kind:z.literal('place'),id:z.string().regex(/^(?:osgb[\w]+|geonames_\d+)$/).max(100)}),
 z.object({kind:z.literal('coordinates'),point:pointSchema,label:z.string().trim().min(1).max(160)})
]);
export type JobOrigin=z.infer<typeof jobOriginSchema>;
export type JobLocationHit={id:string;name:string;description:string;origin:JobOrigin};
export type JobPoint=z.infer<typeof pointSchema>;

async function json(url:URL){
 const response=await fetch(url,{headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('Location lookup is temporarily unavailable. Please try again.');
 return response.json();
}
function ideal(path:string,params:Record<string,string>={}){
 const key=process.env.IDEAL_POSTCODES_API_KEY;
 if(!key)throw new Error('Location lookup is temporarily unavailable. Please try again.');
 const url=new URL('https://api.ideal-postcodes.co.uk/v1/'+path);
 url.searchParams.set('api_key',key);
 for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
 return url;
}
function point(row:{latitude:unknown;longitude:unknown}):JobPoint{
 if(row.latitude===null||row.latitude===''||row.longitude===null||row.longitude==='')throw new Error('No location is available for this place. Try a nearby postcode.');
 const result=pointSchema.safeParse({lat:Number(row.latitude),lon:Number(row.longitude)});
 if(!result.success)throw new Error('Choose a UK town, city or postcode.');
 return result.data;
}
export async function searchJobLocations(query:string):Promise<JobLocationHit[]>{
 if(fullPostcode.test(query)){
  const postcode=formatPostcode(query);
  return [{id:'postcode:'+postcode,name:postcode,description:'UK postcode',origin:{kind:'postcode',postcode}}];
 }
 // OS Open Names covers cities, towns, villages and named places in Great Britain.
 const url=new URL('https://api.postcodes.io/places');url.searchParams.set('q',query);url.searchParams.set('limit','8');
 let placesUnavailable=false;
 const data=await json(url).catch(()=>{placesUnavailable=true;return null});
 const hits:JobLocationHit[]=(Array.isArray(data?.result)?data.result:[]).filter((row:any)=>typeof row.code==='string'&&row.code.startsWith('osgb')&&typeof row.name_1==='string'&&pointSchema.safeParse({lat:row.latitude,lon:row.longitude}).success).map((row:any)=>({id:row.code,name:row.name_1,description:[row.county_unitary||row.district_borough,row.country].filter(Boolean).join(', '),origin:{kind:'place',id:row.code}}));
 if(hits.length)return hits;
 // The existing address provider also covers Northern Ireland place names.
 if(!process.env.IDEAL_POSTCODES_API_KEY){if(placesUnavailable)throw new Error('Location lookup is temporarily unavailable. Please try again.');return []}
 const fallback=await json(ideal('places',{query,country_iso:'GBR'}));
 return (Array.isArray(fallback?.result?.hits)?fallback.result.hits:[]).filter((row:any)=>row.country_iso==='GBR'&&/^geonames_\d+$/.test(row.id)&&typeof row.name==='string'&&typeof row.descriptive_name==='string').slice(0,8).map((row:any)=>({id:row.id,name:row.name,description:row.descriptive_name.startsWith(row.name+', ')?row.descriptive_name.slice(row.name.length+2):row.descriptive_name,origin:{kind:'place',id:row.id}}));
}
export async function postcodePoint(postcode:string):Promise<JobPoint>{
 const value=postcode.replace(/\s/g,'').toUpperCase();
 const data=await json(ideal('postcodes/'+encodeURIComponent(value)));
 const rows=Array.isArray(data?.result)?data.result:[];
 for(const row of rows){try{return point(row)}catch{}}
 throw new Error('That postcode could not be found. Check it and try again.');
}
export async function resolveJobOrigin(origin:JobOrigin):Promise<{point:JobPoint;label:string}>{
 if(origin.kind==='coordinates')return {point:origin.point,label:origin.label};
 if(origin.kind==='postcode')return {point:await postcodePoint(origin.postcode),label:formatPostcode(origin.postcode)};
 if(origin.id.startsWith('osgb')){
  const data=await json(new URL('https://api.postcodes.io/places/'+encodeURIComponent(origin.id)));
  if(!data?.result||typeof data.result.name_1!=='string')throw new Error('Choose the location again from the suggestions.');
  return {point:point(data.result),label:data.result.name_1};
 }
 const data=await json(ideal('places/'+encodeURIComponent(origin.id)));
 if(data?.result?.country_iso!=='GBR'||typeof data.result.name!=='string')throw new Error('Choose a UK town, city or postcode.');
 return {point:point(data.result),label:data.result.name};
}
export function collectionMiles(a:JobPoint,b:JobPoint){
 const rad=(n:number)=>n*Math.PI/180;
 const x=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;
 return Math.round(3958.7613*2*Math.asin(Math.sqrt(Math.min(1,x)))*10)/10;
}
