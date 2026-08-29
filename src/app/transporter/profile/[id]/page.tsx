import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {profileImageUrl} from '@/lib/supabase-storage';

const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());

export default async function TransporterProfilePage({params}:{params:Promise<{id:string}>}){
  const viewer=await currentUser();
  if(!viewer)redirect('/login');
  const {id}=await params;
  const transporter=await prisma.user.findFirst({
    where:{id,role:'TRANSPORTER',accountStatus:'ACTIVE'},
    select:{
      id:true,name:true,createdAt:true,workRestricted:true,
      transporterVerification:{select:{businessName:true,companyNumber:true,yearsOperating:true,website:true,status:true,reviewedAt:true}},
      reviewsReceived:{
        where:{verified:true,moderationStatus:{not:'HIDDEN'}},
        orderBy:{createdAt:'desc'},
        select:{id:true,rating:true,body:true,createdAt:true,transporterResponse:true,transporterRespondedAt:true,customer:{select:{name:true}},booking:{select:{job:{select:{vehicleMake:true,vehicleModel:true}}}}}
      },
      transporterBookings:{where:{customerConfirmedAt:{not:null}},orderBy:{customerConfirmedAt:'desc'},select:{id:true,customerConfirmedAt:true,job:{select:{vehicleMake:true,vehicleModel:true}}}}
    }
  });
  if(!transporter)notFound();
  const profileRows=await prisma.$queryRawUnsafe<Array<{profileImagePath:string|null}>>('SELECT "profileImagePath" FROM "TransporterVerification" WHERE "transporterId" = $1 LIMIT 1',id);
  const imageUrl=profileImageUrl(profileRows[0]?.profileImagePath||null);
  const verification=transporter.transporterVerification;
  const ratings=transporter.reviewsReceived.map(review=>review.rating);
  const reviewCount=ratings.length;
  const averageRating=reviewCount?ratings.reduce((sum,rating)=>sum+rating,0)/reviewCount:null;
  const fiveStarCount=ratings.filter(rating=>rating===5).length;
  const fiveStarPercent=reviewCount?Math.round((fiveStarCount/reviewCount)*100):0;
  const businessName=verification?.businessName||transporter.name;
  const backHref=viewer.role==='CUSTOMER'?'/customer':viewer.role==='TRANSPORTER'?'/transporter':'/admin';
  const recentDeliveries=transporter.transporterBookings.slice(0,4);

  return <main className="shell dashboardShell transporterPublicProfile">
    <Link className="backLink" href={backHref}>← Back to dashboard</Link>
    <section className="dashboardHero transporterProfileHero">
      <div className="transporterProfileIdentity">
        <div className={`transporterProfileAvatar${imageUrl?' hasImage':''}`}>{imageUrl?<img src={imageUrl} alt={`${businessName} profile`}/>:<span>🚛</span>}</div>
        <div><span className="dashboardEyebrow">Transporter profile</span><h1>{businessName}</h1><p>{transporter.name}{verification?.companyNumber?` · Company ${verification.companyNumber}`:''}</p><div className="transporterHeroTrust"><span>{verification?.status==='APPROVED'?'✓ DriveDrop Verified':label(verification?.status||'NOT_STARTED')}</span><span>{averageRating!==null?`★ ${averageRating.toFixed(1)} from ${reviewCount} review${reviewCount===1?'':'s'}`:'★ New transporter'}</span>{verification?.yearsOperating!=null&&<span>{verification.yearsOperating} year{verification.yearsOperating===1?'':'s'} operating</span>}</div></div>
      </div>
      <div className="adminHeroBadge accountStatusBadge"><span>Completed deliveries</span><strong>{transporter.transporterBookings.length}</strong><small>Customer confirmed</small></div>
    </section>

    <section className="transporterTrustSummary" aria-label="Transporter trust summary">
      <div><span className="trustSummaryIcon">✓</span><strong>{verification?.status==='APPROVED'?'Verified':'Verification'}</strong><small>{verification?.status==='APPROVED'?'Approved by DriveDrop':label(verification?.status||'NOT_STARTED')}</small></div>
      <div><span className="trustSummaryIcon">★</span><strong>{averageRating!==null?averageRating.toFixed(1):'New'}</strong><small>{reviewCount?`${reviewCount} verified review${reviewCount===1?'':'s'}`:'No reviews yet'}</small></div>
      <div><span className="trustSummaryIcon">🚗</span><strong>{transporter.transporterBookings.length}</strong><small>Completed deliveries</small></div>
      <div><span className="trustSummaryIcon">🏢</span><strong>{verification?.yearsOperating??'—'}</strong><small>{verification?.yearsOperating!=null?'Years operating':'Experience not provided'}</small></div>
    </section>

    <div className="transporterProfileGrid">
      <div className="transporterProfileSide">
        <section className="dashboardCard accountCard"><div className="panelHeading"><div><span className="panelIcon">🏢</span><div><h2>Business profile</h2><p>Key information to help you compare this transporter with other quotes.</p></div></div></div><div className="infoPanel accountInfoPanel"><div className="infoRow"><span>Business name</span><b>{businessName}</b></div><div className="infoRow"><span>DriveDrop verification</span><b>{label(verification?.status||'NOT_STARTED')}</b></div><div className="infoRow"><span>Years operating</span><b>{verification?.yearsOperating??'Not provided'}</b></div><div className="infoRow"><span>Member since</span><b>{transporter.createdAt.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</b></div><div className="infoRow"><span>Completed deliveries</span><b>{transporter.transporterBookings.length}</b></div><div className="infoRow"><span>Customer rating</span><b>{averageRating!==null?`${averageRating.toFixed(1)} / 5 (${reviewCount})`:'No reviews yet'}</b></div>{verification?.companyNumber&&<div className="infoRow"><span>Company number</span><b>{verification.companyNumber}</b></div>}{verification?.website&&<div className="infoRow"><span>Website</span><b><a href={verification.website} target="_blank" rel="noreferrer">Visit website ↗</a></b></div>}</div><p className="profilePrivacyNote">Private phone and address details are not displayed publicly. Booking and messaging details remain protected inside DriveDrop.</p></section>

        <section className="dashboardCard accountCard recentDeliveryProof"><div className="panelHeading"><div><span className="panelIcon">🚗</span><div><h2>Recent completed deliveries</h2><p>Customer-confirmed work completed through DriveDrop.</p></div></div></div>{recentDeliveries.length===0?<div className="emptyState compactProfileEmpty"><div>🚗</div><h3>No completed deliveries yet</h3><p>This transporter has not yet completed a customer-confirmed DriveDrop delivery.</p></div>:<div className="recentProfileDeliveries">{recentDeliveries.map(delivery=><div className="recentProfileDelivery" key={delivery.id}><span>✓</span><div><strong>{delivery.job.vehicleMake} {delivery.job.vehicleModel}</strong><small>{delivery.customerConfirmedAt?.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small></div></div>)}</div>}</section>
      </div>

      <section className="dashboardCard accountCard transporterReviewsCard"><div className="panelHeading"><div><span className="panelIcon">★</span><div><h2>Verified customer reviews</h2><p>Reviews come only from completed DriveDrop bookings.</p></div></div></div>{reviewCount>0&&<div className="profileRatingOverview"><div className="profileRatingScore"><strong>{averageRating?.toFixed(1)}</strong><span>★★★★★</span><small>{reviewCount} verified review{reviewCount===1?'':'s'}</small></div><div className="profileRatingQuality"><strong>{fiveStarPercent}%</strong><span>5-star reviews</span><small>{fiveStarCount} of {reviewCount} customer rating{reviewCount===1?'':'s'}</small></div></div>}{transporter.reviewsReceived.length===0?<div className="emptyState"><div>★</div><h3>No reviews yet</h3><p>This transporter is new to DriveDrop reviews.</p></div>:<div className="transporterProfileReviews">{transporter.reviewsReceived.map(review=><article className="transporterProfileReview" key={review.id}><div className="transporterReviewTop"><div><strong>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</strong><span className="verifiedReviewLabel">✓ Verified booking</span></div><span>{review.createdAt.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span></div><p>{review.body||'Customer left a verified rating without a written review.'}</p><small>{review.customer.name} · {review.booking.job.vehicleMake} {review.booking.job.vehicleModel}</small>{review.transporterResponse&&<div className="transporterReviewResponse"><b>Transporter response</b><p>{review.transporterResponse}</p></div>}</article>)}</div>}</section>
    </div>
  </main>;
}
