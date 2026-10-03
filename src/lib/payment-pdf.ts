import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import {type CustomerPayment,paymentMoney,paymentDate,paymentLabel,paymentTotals} from './customer-payments';

let fonts:Promise<Buffer[]>|undefined;
// Embed licensed Unicode fonts so downloads are self-contained.
export async function paymentPdf(rows:CustomerPayment[],customerName:string,receipt:boolean,filterDescription:string){
 const doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 fonts??=Promise.all([readFile(process.cwd()+'/public/payment-fonts/DejaVuSans.ttf'),readFile(process.cwd()+'/public/payment-fonts/DejaVuSans-Bold.ttf')]).catch(error=>{fonts=undefined;throw error});
 const [regularBytes,boldBytes]=await fonts;
 const [normal,bold]=await Promise.all([doc.embedFont(regularBytes),doc.embedFont(boldBytes)]);
 const navy=rgb(.03,.12,.24),muted=rgb(.32,.42,.55),orange=rgb(1,.4,.1);
 doc.setTitle(receipt?'DriveDrop payment receipt':'DriveDrop payment statement');
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
 const title=receipt?'Payment receipt':'Payment statement';
 page.drawRectangle({x:0,y:823,width:595.28,height:19,color:orange});
 line('DriveDrop',23,true);line(title,19,true);line(`Customer: ${customerName}`);line(`Issued: ${paymentDate(new Date().toISOString())}`);line(filterDescription);y-=5;rule();
 if(rows.some(r=>r.test)){line('Includes TEST payment records. Test records do not evidence a live payment.',11,true);y-=8;}
 const totals=paymentTotals(rows);
 line(`Total paid: ${paymentMoney(totals.paid)}     Refunded: ${paymentMoney(totals.refunded)}     Net paid: ${paymentMoney(totals.net)}`,12,true);y-=8;rule();
 if(!rows.length)line('No payment records match these filters.');
 for(const row of rows){
  if(y<240)newPage();
  line(`${row.reference} - ${row.vehicle}`,13,true);
  if(row.test)line('TEST PAYMENT RECORD',10,true);
  line(`Collection: ${row.collection}`);line(`Delivery: ${row.delivery}`);
  line(`Agreed booking total: ${paymentMoney(row.totalPence,row.currency)}`);
  line(`Total paid: ${paymentMoney(row.paidPence,row.currency)} | Refunds: ${paymentMoney(row.refundedPence,row.currency)} | Net paid: ${paymentMoney(row.paidPence-row.refundedPence,row.currency)}`);
  line(`Paid on: ${paymentDate(row.paidAt)} | Status: ${paymentLabel(row.status)}`);
  line(`Payment reference: ${row.id}`,9);y-=7;rule();
 }
 line('This document records payment activity held by DriveDrop. It is not a VAT invoice.',9);
 page.drawText(`DriveDrop | Page ${pageNumber}`,{x:42,y:28,size:9,font:normal,color:muted});
 return doc.save();
}
