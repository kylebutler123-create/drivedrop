import {NextRequest,NextResponse} from 'next/server';

export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get('id')?.trim();
  if(!id)return NextResponse.json({error:'Address id required'},{status:400});
  const key=process.env.IDEAL_POSTCODES_API_KEY;
  if(!key)return NextResponse.json({error:'Address lookup is not configured'},{status:503});
  const url=`https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses/${encodeURIComponent(id)}/gbr?api_key=${encodeURIComponent(key)}`;
  const res=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
  const data=await res.json();
  if(!res.ok)return NextResponse.json({error:data?.message||'Address lookup failed'},{status:res.status});
  const a=data?.result||data;
  const parts=[a.line_1,a.line_2,a.line_3,a.post_town,a.county,a.postcode].filter(Boolean);
  return NextResponse.json({address:parts.join(', '),postcode:a.postcode});
}
