import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';

export async function GET(){
 const user=await currentUser();
 const headers={'Cache-Control':'private, no-store, max-age=0'};
 return user?NextResponse.json({id:user.id,name:user.name,email:user.email,role:user.role},{headers})
  :NextResponse.json({error:'Unauthorized'},{status:401,headers});
}
