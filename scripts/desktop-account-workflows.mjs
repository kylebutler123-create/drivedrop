/** Real application routes and ledger assertions, exclusively on disposable local TEST finance. */
import {PrismaClient} from '@prisma/client';

export async function checkLocalBookingWorkflow({request,base,states,record}) {
  const database=new URL(process.env.POSTGRES_PRISMA_URL||'');
  const origin=new URL(base);
  if(process.env.CI!=='true'||process.env.DRIVEDROP_ISOLATED_BROWSER_TEST!=='true'||
    !['127.0.0.1','localhost'].includes(database.hostname)||database.port!=='55432'||database.pathname!=='/drivedrop_browser_ci'||
    !['127.0.0.1','localhost'].includes(origin.hostname)||origin.port!=='3301'||process.env.VERCEL_ENV!=='preview')throw Error('Local browser CI only');
  if(process.env.STRIPE_SECRET_KEY||process.env.RESEND_API_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('External service credentials are forbidden');
  const prisma=new PrismaClient(),apis={};
  let guest;
  const check=(name,passed,detail='')=>{record(name,passed,detail);if(!passed)throw Error(`Workflow prerequisite failed: ${name}`)};
  const body=async response=>({status:response.status(),data:await response.json()});
  try {
    for(const role of ['customer','transporter','admin'])apis[role]=await request.newContext({baseURL:base,storageState:states[`updated-${role}`]});
    guest=await request.newContext({baseURL:base});
    check('Unauthenticated admin verification rejected',(await guest.get('/api/admin/verifications')).status()===403);
    check('Customer cannot access admin verification',(await apis.customer.get('/api/admin/verifications')).status()===403);
    check('Transporter cannot confirm customer receipt',(await apis.transporter.patch('/api/bookings/confirm-delivery',{data:{bookingId:'ci-booking-awaiting'}})).status()===403);

    const jobInput={collection:'CI collection',delivery:'CI delivery',collectionDate:new Date(Date.now()+2*86400000).toISOString().slice(0,10),collectionFrom:'09:00',collectionUntil:'17:00',transportType:'OPEN',vehicleType:'Car',vehicleMake:'CI',vehicleModel:'Workflow',running:true};
    const invalid=await body(await apis.customer.post('/api/jobs',{data:{...jobInput,transportType:'ENCLOSED',vehicleType:'Van'}}));
    check('Server rejects incompatible enclosed/van request',invalid.status===400&&/enclosed/i.test(invalid.data.error),JSON.stringify(invalid));
    const missingWindow=await body(await apis.customer.post('/api/jobs',{data:{...jobInput,collectionFrom:undefined,collectionUntil:undefined}}));
    check('Server requires the collection window',missingWindow.status===400&&/Available from/.test(missingWindow.data.error));
    const job=await body(await apis.customer.post('/api/jobs',{data:jobInput}));
    check('Local customer creates quote request',job.status===201&&job.data.status==='OPEN',JSON.stringify({status:job.status,error:job.data.error}));
    const quote=await body(await apis.transporter.post('/api/quotes',{data:{jobId:job.data.id,pricePence:20000,message:'Isolated CI quote; no external recipient'}}));
    check('Local approved transporter submits quote',quote.status===201&&Boolean(quote.data.id),JSON.stringify({status:quote.status,error:quote.data.error}));
    const selected=await body(await apis.customer.post('/api/bookings',{data:{quoteId:quote.data.id}}));
    const availability=selected.data;
    check('Quote selection authorises TEST payment and awaits transporter',selected.status===201&&availability.status==='AWAITING_TRANSPORTER'&&availability.paymentState==='AUTHORISED'&&availability.paymentProvider==='TEST'&&availability.pricePence===22000&&!availability.bookingId,JSON.stringify(selected));
    check('Authorisation alone creates no booking',await prisma.booking.count({where:{jobId:job.data.id}})===0);
    const repeatSelection=await body(await apis.customer.post('/api/bookings',{data:{quoteId:quote.data.id}}));
    check('Repeated quote selection reuses the pending authorisation',repeatSelection.status===200&&repeatSelection.data.id===availability.id&&await prisma.availabilityRequest.count({where:{jobId:job.data.id}})===1);
    const awaiting=await (await apis.transporter.get('/api/availability')).json();
    const transporterRequest=awaiting.find(r=>r.id===availability.id);
    check('Transporter sees their £200 quote without the customer fee',transporterRequest?.pricePence===20000&&!('authorisedAmountPence' in transporterRequest)&&!('platformFeePence' in transporterRequest));
    const wrongParty=await apis.customer.patch('/api/availability',{data:{requestId:availability.id,action:'CONFIRM'}});
    check('Customer cannot confirm transporter availability',!wrongParty.ok()&&await prisma.booking.count({where:{jobId:job.data.id}})===0);
    const confirmed=await body(await apis.transporter.patch('/api/availability',{data:{requestId:availability.id,action:'CONFIRM'}}));
    check('Transporter confirmation captures TEST payment and creates booking',confirmed.status===200&&confirmed.data.status==='BOOKED'&&confirmed.data.paymentState==='CAPTURED'&&Boolean(confirmed.data.bookingId),JSON.stringify(confirmed));
    const booking=await prisma.booking.findUniqueOrThrow({where:{id:confirmed.data.bookingId},include:{payment:{include:{events:true}}}});
    check('Existing fee calculation remains authoritative',booking.status==='CONFIRMED'&&booking.payment.provider==='TEST'&&booking.payment.status==='PAID'&&booking.payment.paidPence===22000&&booking.payment.platformFeePence===2000&&booking.payment.transporterProceedsPence===20000);
    const repeatConfirmation=await body(await apis.transporter.patch('/api/availability',{data:{requestId:availability.id,action:'CONFIRM'}}));
    check('Repeat confirmation creates no duplicate booking or capture',repeatConfirmation.status===200&&repeatConfirmation.data.bookingId===booking.id&&await prisma.booking.count({where:{jobId:job.data.id}})===1&&await prisma.financeEvent.count({where:{paymentId:booking.payment.id,type:'PAYMENT_CAPTURED'}})===1);
    for(const [role,expected] of [['customer',22000],['transporter',20000]]){
      const rows=await (await apis[role].get('/api/my-bookings')).json();
      const visible=rows.find(b=>b.id===booking.id);
      check(`${role}: booking API exposes the correct price without commission`,visible?.payment?.paidPence===expected&&!('platformFeePence' in visible.payment));
    }
    const sent=await apis.customer.post('/api/bookings/messages',{multipart:{bookingId:booking.id,body:'Isolated CI message; no real customer or recipient.'}});
    check('Real local booking message can be sent',sent.status()===201);
    const received=await apis.transporter.get(`/api/bookings/messages?bookingId=${booking.id}`);
    const messages=await received.json();
    check('Other booking party can read the local message',received.ok()&&Array.isArray(messages)&&messages.some(x=>x.body.startsWith('Isolated CI message')));

    const fine=await body(await apis.admin.post('/api/admin/disputes',{data:{disputeId:'ci-dispute-held',action:'FINE_TRANSPORTER',amountPence:7525}}));
    check('Admin records custom £75.25 fine in test database',fine.status===200,JSON.stringify(fine));
    const confirmation=await apis.customer.patch('/api/bookings/confirm-delivery',{data:{bookingId:'ci-booking-awaiting'}});
    check('Customer confirms delivered test booking',confirmation.ok());
    const early=await body(await apis.admin.post('/api/admin/payments/payout',{data:{paymentId:'ci-payment-awaiting'}}));
    check('Natural 24-hour hold rejects immediate payout',early.status===400&&/24-hour/.test(early.data.error)&&await prisma.financeEvent.count({where:{paymentId:'ci-payment-awaiting',type:'PAYOUT_PAID'}})===0,JSON.stringify(early));
    // Exercise the existing reviewed-dispute exception through actual routes.
    // No clock override, modified confirmation time or early-release bypass.
    const dispute=await body(await apis.customer.post('/api/disputes',{data:{bookingId:'ci-booking-awaiting',reason:'Isolated CI review',details:'Synthetic local case for the admin resolution exception'}}));
    check('Customer can dispute within the new 24-hour window',dispute.status===201&&Boolean(dispute.data.id),JSON.stringify(dispute));
    const resolved=await body(await apis.admin.patch('/api/admin/disputes',{data:{disputeId:dispute.data.id,status:'RESOLVED',resolution:'RELEASE_PAYOUT',resolutionNote:'Isolated TEST fixture reviewed; approve release through the existing exception.'}}));
    check('Admin explicitly resolves the local dispute for release',resolved.status===200&&resolved.data.status==='RESOLVED',JSON.stringify(resolved));
    const payout=await body(await apis.admin.post('/api/admin/payments/payout',{data:{paymentId:'ci-payment-awaiting'}}));
    check('Approved dispute exception releases the TEST payout',payout.status===200&&payout.data.payoutStatus==='PAID',JSON.stringify({status:payout.status,error:payout.data.error}));
    check('Custom £75.25 fine deducted once from eligible test proceeds',payout.data.cancellationDeductionPence===7525&&payout.data.transporterProceedsPence===22475);
    const repeat=await apis.admin.post('/api/admin/payments/payout',{data:{paymentId:'ci-payment-awaiting'}});
    check('Repeated payout request does not pay twice',repeat.status()===400&&await prisma.financeEvent.count({where:{paymentId:'ci-payment-awaiting',type:'PAYOUT_PAID'}})===1);
    const held=await body(await apis.admin.post('/api/admin/payments/payout',{data:{paymentId:'ci-payment-held'}}));
    check('Active dispute prevents payout',held.status===400&&/active dispute/i.test(held.data.error));
  } finally {
    for(const api of [...Object.values(apis),guest].filter(Boolean))await api.dispose();
    await prisma.$disconnect();
  }
}
