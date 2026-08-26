import {NextRequest,NextResponse} from 'next/server';

export async function GET(req:NextRequest){
  const q=req.nextUrl.searchParams.get('q')?.trim();
  if(!q||q.length<3)return NextResponse.json({hits:[]});
  const key=process.env.IDEAL_POSTCODES_API_KEY;
  if(!key){console.error('IDEAL_POSTCODES_API_KEY missing in runtime');return NextResponse.json({error:'Address lookup is not configured'},{status:503});}
  const url=new URL('https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses');
  url.searchParams.set('api_key',key);url.searchParams.set('query',q);
  const res=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
  const data=await res.json();
  if(!res.ok){console.error('Ideal Postcodes search failed',{status:res.status,message:data?.message});return NextResponse.json({error:data?.message||'Address lookup failed'},{status:res.status});}
  return NextResponse.json({hits:(data?.result?.hits||[]).slice(0,8).map((h:any)=>({id:h.id,suggestion:h.suggestion}))});
}
