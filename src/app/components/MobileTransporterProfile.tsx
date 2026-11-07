import Link from 'next/link';
import Icon from './ApprovedIcon';
import MobileProfilePhotos,{ProfileImage,type ProfilePhoto} from './MobileProfilePhotos';
import '../mobile-transporter-profile.css';

type Review={id:string;rating:number;body:string|null;createdAt:Date;transporterResponse:string|null;customer:{name:string};booking:{job:{vehicleMake:string;vehicleModel:string}}};
type Delivery={id:string;customerConfirmedAt:Date|null;job:{vehicleMake:string;vehicleModel:string}};
type Props={
  name:string;businessName:string;createdAt:Date;
  verification:{status:string;yearsOperating:number|null;companyNumber:string|null;website:string|null}|null;
  reviews:Review[];deliveries:Delivery[];averageRating:number|null;
  imageUrl:string|null;imageKind:'person'|'logo';photos:ProfilePhoto[];backHref:string;backLabel:string;
};
const label=(value:string)=>value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const date=(value:Date)=>value.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'});
function websiteUrl(value?:string|null){
  if(!value)return null;
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null}catch{return null}
}

export default function MobileTransporterProfile({name,businessName,createdAt,verification,reviews,deliveries,averageRating,imageUrl,imageKind,photos,backHref,backLabel}:Props){
  const verified=verification?.status==='APPROVED';
  const initials=businessName.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  const website=websiteUrl(verification?.website);
  return <main className="ddTransporterProfile">
    <Link href={backHref} className="ddPublicProfileBack"><Icon name="arrow"/>{backLabel}</Link>
    <h1>Transporter profile</h1>
    <section className="ddPublicProfileIdentity" aria-label="Transporter summary">
      <div className="ddPublicProfilePerson"><ProfileImage url={imageUrl} alt={`${businessName} profile`} initials={initials} kind={imageKind}/><div><h2>{businessName}</h2><p>{name}</p><span className={`ddPublicProfileVerified${verified?' isVerified':''}`}>{verified&&<Icon name="circleCheck"/>}{verified?'MoveAMotor verified':label(verification?.status||'NOT_STARTED')}</span></div></div>
      <dl className="ddPublicProfileStats">
        <div><dt>{reviews.length?`${reviews.length} review${reviews.length===1?'':'s'}`:'No reviews yet'}</dt><dd>{averageRating===null?'New':<>{averageRating.toFixed(1)}<Icon name="star"/></>}</dd></div>
        <div><dt>Completed deliveries</dt><dd>{deliveries.length}</dd></div>
        <div><dt>{verification?.yearsOperating==null?'Experience not provided':'Years operating'}</dt><dd>{verification?.yearsOperating??'—'}</dd></div>
      </dl>
    </section>

    <section className="ddPublicProfileBusiness" aria-labelledby="profile-business-heading">
      <h2 id="profile-business-heading">Business details</h2>
      <div className="ddPublicProfileBusinessCard">
        <dl><div><dt>Member since</dt><dd>{createdAt.toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'Europe/London'})}</dd></div></dl>
        <details><summary>Business information<Icon name="chevronDown"/></summary><dl>
          <div><dt>Business name</dt><dd>{businessName}</dd></div>
          <div><dt>Transporter</dt><dd>{name}</dd></div>
          <div><dt>Verification</dt><dd>{label(verification?.status||'NOT_STARTED')}</dd></div>
          {verification?.companyNumber&&<div><dt>Company number</dt><dd>{verification.companyNumber}</dd></div>}
          {website&&<div><dt>Website</dt><dd><a href={website} target="_blank" rel="noopener noreferrer">Visit website ↗</a></dd></div>}
        </dl></details>
      </div>
    </section>

    <MobileProfilePhotos photos={photos}/>

    <section className="ddPublicProfileReviews" aria-labelledby="profile-reviews-heading">
      <h2 id="profile-reviews-heading">Verified customer reviews</h2><p className="ddPublicProfileSubtitle">From completed MoveAMotor bookings</p>
      {reviews.length?<div className="ddPublicProfileReviewList">{reviews.map(review=><article className="ddPublicProfileReview" key={review.id}>
        <div className="ddPublicProfileReviewTop"><span className="ddPublicProfileStars" role="img" aria-label={`${review.rating} out of 5 stars`}>{Array.from({length:5},(_,index)=><span key={index} className={index<review.rating?'isFilled':''}><Icon name="star"/></span>)}</span><time dateTime={review.createdAt.toISOString()}>{date(review.createdAt)}</time></div>
        <p>{review.body||'Customer left a verified rating without a written review.'}</p>
        <div className="ddPublicProfileReviewer"><div><strong>{review.customer.name}</strong><span>{review.booking.job.vehicleMake} {review.booking.job.vehicleModel}</span></div><small><Icon name="circleCheck"/>Verified booking</small></div>
        {review.transporterResponse&&<div className="ddPublicProfileResponse"><strong>Transporter response</strong><p>{review.transporterResponse}</p></div>}
      </article>)}</div>:<p className="ddPublicProfileEmpty">No reviews yet. Reviews will appear after completed MoveAMotor bookings.</p>}
    </section>

    <section className="ddPublicProfileDeliveries" aria-labelledby="profile-deliveries-heading">
      <h2 id="profile-deliveries-heading">Recent completed deliveries</h2><p className="ddPublicProfileSubtitle">Customer confirmed</p>
      {deliveries.length?<ul>{deliveries.slice(0,4).map(delivery=><li key={delivery.id}><Icon name="circleCheck"/><strong>{delivery.job.vehicleMake} {delivery.job.vehicleModel}</strong>{delivery.customerConfirmedAt&&<time dateTime={delivery.customerConfirmedAt.toISOString()}>{date(delivery.customerConfirmedAt)}</time>}</li>)}</ul>:<p className="ddPublicProfileEmpty">No customer-confirmed deliveries yet.</p>}
    </section>
    <Link href={backHref} className="ddPublicProfileBack ddPublicProfileBackButton"><Icon name="arrow"/>{backLabel}</Link>
  </main>;
}
