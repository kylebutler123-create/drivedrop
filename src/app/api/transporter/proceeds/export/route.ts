import {filterProceeds} from '@/lib/proceeds-filters';
import {currentUser} from '@/lib/auth';
import {loadProceeds,proceedsPeriod,inProceedsPeriod,proceedsCsv} from '@/lib/transporter-proceeds';
import {proceedsPdf} from '@/lib/proceeds-pdf';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 const user=await currentUser();
 if(!user)return new Response('Sign in to download your statement.',{status:401,headers});
 if(user.role!=='TRANSPORTER')return new Response('Forbidden',{status:403,headers});
 const search=new URL(request.url).searchParams;
 const format=search.get('format');
 if(format!=='pdf'&&format!=='csv')return new Response('Choose PDF or CSV.',{status:400,headers});
 let period;
 try{period=proceedsPeriod({year:search.get('year')??undefined,start:search.get('start')??undefined,end:search.get('end')??undefined})}
 catch(error){return new Response((error as Error).message,{status:400,headers})}
 const bookingId=search.get('bookingId');
 if(bookingId&&!/^[a-zA-Z0-9_-]{1,100}$/.test(bookingId))return new Response('Invalid booking.',{status:400,headers});
 const owned=await loadProceeds(user.id);
 const rows=bookingId?owned.filter(row=>row.id===bookingId&&row.payment&&row.status==='DELIVERED'):filterProceeds(owned.filter(row=>row.payment&&inProceedsPeriod(row,period)),{q:search.get('q')||'',month:search.get('month')||'',status:search.get('status')||'',adjustment:search.get('adjustment')||'ALL'});
 if(bookingId&&!rows.length)return new Response('Statement not found.',{status:404,headers});
 const filename='DriveDrop-proceeds-'+period.start+'-to-'+period.end+'.'+format;
 const body=format==='csv'?proceedsCsv(rows):new Uint8Array(await proceedsPdf(rows,user.name||'Transporter',period));
 return new Response(body,{headers:{...headers,'Content-Type':format==='csv'?'text/csv; charset=utf-8':'application/pdf','Content-Disposition':'attachment; filename="'+filename+'"'}});
}
