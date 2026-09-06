import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {randomUUID} from 'crypto';
import {z} from 'zod';

const S=z.object({
 accountHolderName:z.string().trim().min(2).max(120),
 sortCode:z.string().transform(v=>v.replace(/\D/g,'')).pipe(z.string().length(6)),
 accountNumber:z.string().transform(v=>v.replace(/\D/g,'')).pipe(z.string().min(6).max(8))
});

function testFinanceDisabled(){
 const isVercelProduction=process.env.VERCEL_ENV==='production';
 const isLocalProduction=!process.env.VERCEL_ENV&&process.env.NODE_ENV==='production';
 return isVercelProduction||isLocalProduction;
}

export async function GET(){
 const u=await currentUser();
 if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
 const rows=await prisma.$queryRaw<any[]>`SELECT "accountHolderName","sortCodeLast2","accountNumberLast4","completedAt","updatedAt" FROM "TransporterPayoutDetails" WHERE "userId"=${u.id} LIMIT 1`;
 const d=rows[0];
 return NextResponse.json(d?{
  complete:true,
  accountHolderName:d.accountHolderName,
  sortCodeMasked:`••-••-${d.sortCodeLast2}`,
  accountNumberMasked:`••••${d.accountNumberLast4}`,
  completedAt:d.completedAt,
  updatedAt:d.updatedAt
 }:{complete:false});
}

export async function POST(r:Request){
 if(testFinanceDisabled())return NextResponse.json({error:'Test payout setup is disabled in production'},{status:403});
 const u=await currentUser();
 if(!u||u.role!=='TRANSPORTER')return NextResponse.json({error:'Transporter access required'},{status:403});
 const parsed=S.safeParse(await r.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Enter a valid account holder name, 6-digit sort code and account number'},{status:400});
 const d=parsed.data,now=new Date();
 try{
  // Preview uses sandbox finance only. Store masked test details, never the full bank numbers.
  await prisma.$executeRaw`INSERT INTO "TransporterPayoutDetails" ("id","userId","accountHolderName","sortCodeLast2","accountNumberLast4","detailsToken","completedAt","updatedAt") VALUES (${randomUUID()},${u.id},${d.accountHolderName},${d.sortCode.slice(-2)},${d.accountNumber.slice(-4)},${'SANDBOX_TEST_ONLY'},${now},${now}) ON CONFLICT ("userId") DO UPDATE SET "accountHolderName"=EXCLUDED."accountHolderName","sortCodeLast2"=EXCLUDED."sortCodeLast2","accountNumberLast4"=EXCLUDED."accountNumberLast4","detailsToken"=EXCLUDED."detailsToken","completedAt"=EXCLUDED."completedAt","updatedAt"=EXCLUDED."updatedAt"`;
  return NextResponse.json({
   ok:true,
   complete:true,
   accountHolderName:d.accountHolderName,
   sortCodeMasked:`••-••-${d.sortCode.slice(-2)}`,
   accountNumberMasked:`••••${d.accountNumber.slice(-4)}`
  });
 }catch(error){
  console.error('[payout-details] sandbox save failed',{
   userId:u.id,
   error:error instanceof Error?error.message:'Unknown error'
  });
  return NextResponse.json({error:'Unable to save payout details'},{status:500});
 }
}
