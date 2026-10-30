import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {searchJobLocations} from '@/lib/job-locations';

export async function GET(request:Request){
 const user=await currentUser();
 if(!user||user.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter login required'},{status:403});
 const query=new URL(request.url).searchParams.get('q')?.trim()||'';
 if(query.length<3)return NextResponse.json({hits:[]});
 if(query.length>100)return NextResponse.json({error:'Enter a shorter town, city or postcode.'},{status:400});
 try{return NextResponse.json({hits:await searchJobLocations(query)})}
 catch{return NextResponse.json({error:'Location lookup is unavailable. Try again, enter a full postcode, or use your location.'},{status:503})}
}
