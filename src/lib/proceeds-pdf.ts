import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import {type ProceedsBooking,type ProceedsPeriod,periodDescription,londonDate} from './transporter-proceeds';
const money=(p:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p/100);

let fonts:Promise<Buffer[]>|undefined;
// Embed licensed Unicode fonts so downloads are self-contained.
export async function proceedsPdf(rows:ProceedsBooking[],transporterName:string,period:ProceedsPeriod){
 const doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 fonts??=Promise.all([readFile(process.cwd()+'/public/payment-fonts/DejaVuSans.ttf'),readFile(process.cwd()+'/public/payment-fonts/DejaVuSans-Bold.ttf')]).catch(error=>{fonts=undefined;throw error});
 const [regularBytes,boldBytes]=await fonts;
 const [normal,bold]=await Promise.all([doc.embedFont(regularBytes),doc.embedFont(boldBytes)]);
 const navy=rgb(.03,.12,.24),muted=rgb(.32,.42,.55),orange=rgb(1,.4,.1);
 doc.setTitle('DriveDrop proceeds statement');
 doc.setAuthor('DriveDrop');
 let page=doc.addPage([595.28,841.89]),y=780,pageNumber=1;
 // Preserve unsupported characters as explicit Unicode codes rather than losing data.
 const characterSet=new Set(normal.getCharacterSet());
 const safe=(text:string)=>Array.from(text).map(c=>c==='\n'||characterSet.has(c.codePointAt(0)!)?c:`[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`).join('');
 const newPage=()=>{page.drawText(`DriveDrop | Page ${pageNumber++}`,{x:42,y:28,size:9,font:normal,color:muted});page=doc.addPage([595.28,841.89]);y=780;};
 const line=(text:string,size=11,strong=false)=>{
  const font=strong?bold:normal;let buffer='';
  const flush=()=>{if(y<60)newPage();page.drawText(buffer.trimEnd(),{x:44,y,size,font,color:strong?navy:muted});y-=size+6;buffer='';};
  for(const word of safe(text).split(/(\s+)/)){
   if(word.includes('\n')){flush();continue;}
   if(buffer&&font.widthOfTextAtSize(buffer+word,size)>505)flush();
   if(font.widthOfTextAtSize(word,size)>505){for(const character of word){if(font.widthOfTextAtSize(buffer+character,size)>505)flush();buffer+=character;}}
   else buffer+=(buffer||word.trim()?word:'');
  }
  if(buffer){if(y<60)newPage();page.drawText(buffer,{x:44,y,size,font,color:strong?navy:muted});y-=size+7;}
 };
 const rule=()=>{if(y<70)newPage();page.drawLine({start:{x:44,y:y+2},end:{x:551,y:y+2},thickness:.6,color:rgb(.8,.86,.92)});y-=17;};
 page.drawRectangle({x:0,y:823,width:595.28,height:19,color:orange});
 line('DriveDrop',23,true);line('Proceeds statement',19,true);
 line('Transporter: '+transporterName);line('Period: '+periodDescription(period));
 line('Issued: '+londonDate(new Date()));
 line('Period is based on booking date (Europe/London). Payout statuses are current at download time.',9);
 line('Booked proceeds are not the same as money received. Paid dates are listed separately.',9);rule();
 const active=rows.filter(r=>r.status!=='CANCELLED'&&r.payment?.payoutStatus!=='CANCELLED');
 const total=active.reduce((sum,r)=>sum+(r.payment?.transporterProceedsPence||0)+(r.payment?.cancellationDeductionPence||0),0);
 const paid=active.filter(r=>r.payment?.payoutStatus==='PAID').reduce((sum,r)=>sum+(r.payment?.transporterProceedsPence||0),0);
 const fines=rows.reduce((sum,r)=>sum+(r.payment?.cancellationDeductionPence||0),0);
 const refunds=rows.reduce((sum,r)=>sum+(r.payment?.refundedPence||0),0);
 line('Booked proceeds before fines: '+money(total),12,true);
 line('Net paid proceeds: '+money(paid)+' | Fines: '+money(fines)+' | Refund adjustments: '+money(refunds));rule();
 if(!rows.length)line('No proceeds records in this period.');
 for(const row of rows){
  const p=row.payment;if(!p)continue;
  if(y<250)newPage();
  const net=p.payoutStatus==='CANCELLED'?0:p.transporterProceedsPence||0;
  const fine=p.cancellationDeductionPence||0;
  line('DD-'+row.id.slice(-8).toUpperCase()+' - '+row.job.vehicleMake+' '+row.job.vehicleModel,13,true);
  line('Booking ID: '+row.id,9);
  line('Booked on: '+londonDate(row.createdAt)+' | Customer: '+(row.customer.name||''));
  line('Registration: '+(row.job.registration||'Not recorded'));
  line('Collection: '+row.job.collection);line('Delivery: '+row.job.delivery);
  line('Collection date: '+(row.job.collectionDate?londonDate(row.job.collectionDate):'Not recorded'));
  line('Proceeds before fines: '+money(net+fine)+' | Fine deducted: '+money(fine));
  line('Net proceeds: '+money(net)+' | Refund adjustment: '+money(p.refundedPence||0));
  line('Delivery status: '+row.status.replaceAll('_',' ')+' | Payout status: '+p.payoutStatus);
  line('Paid on: '+(p.events[0]?londonDate(p.events[0].createdAt):'Not recorded'));rule();
 }
 line('This statement records proceeds held by DriveDrop. It is not a VAT invoice.',9);
 page.drawText(`DriveDrop | Page ${pageNumber}`,{x:42,y:28,size:9,font:normal,color:muted});
 return doc.save();
}
