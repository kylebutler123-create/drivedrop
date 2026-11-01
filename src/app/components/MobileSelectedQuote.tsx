import Icon from './ApprovedIcon';
import {MobileVehiclePhoto} from './MobileTransportDesign';
import type {RequestRow} from './AvailabilityPanel';
import s from './MobileSelectedQuote.module.css';

const collectionDay = new Intl.DateTimeFormat('en-GB', {weekday:'long', day:'numeric', month:'long', timeZone:'UTC'});
const deadline = new Intl.DateTimeFormat('en-GB', {weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'Europe/London'});
const proceeds = new Intl.NumberFormat('en-GB', {style:'currency', currency:'GBP'});

type Props = {
  request: RequestRow;
  busy: boolean;
  error: string;
  checked: boolean;
  onCheck: (checked:boolean) => void;
  onConfirm: () => void;
  onDecline: () => void;
  onRefresh: () => void;
};

export default function MobileSelectedQuote({request:r,busy,error,checked,onCheck,onConfirm,onDecline,onRefresh}:Props) {
  const capturing = r.status === 'CAPTURING';
  const {collectionFrom:from, collectionUntil:until} = r;
  const window = from && until ? `${from}–${until}` : from ? `From ${from}` : until ? `By ${until}` : '';
  return <article className={s.card} aria-busy={busy}>
    <div className={s.hero}>
      <MobileVehiclePhoto job={r.job}/>
      <span className={s.badge}>{capturing ? 'Confirming payment' : 'Confirmation needed'}</span>
    </div>
    <div className={s.body}>
      <div className={s.first}>
        <h2>{r.job.vehicleMake} {r.job.vehicleModel}</h2>
        <div className={s.price}><strong>{proceeds.format(r.pricePence/100)}</strong><small>Your quoted proceeds</small></div>
      </div>
      <div className={s.route}><Icon name="location"/><span>{r.job.collection}</span><b aria-label="to">→</b><span>{r.job.delivery}</span></div>
      <div className={s.window}>
        <small>Agreed collection window</small>
        <time dateTime={r.collectionDate}>{collectionDay.format(new Date(r.collectionDate))}</time>
        <strong>{window ? `${window} · UK time` : 'Time to be arranged'}</strong>
      </div>
      {capturing ? <>
        <h3>Confirming payment</h3>
        <p role="status">You’ve confirmed availability. The delivery becomes active once the payment succeeds.</p>
        <button type="button" className={s.secondary} onClick={onRefresh}>Check payment status</button>
      </> : <>
        <h3>Can you still collect this vehicle?</h3>
        <p>The customer has authorised payment. DriveDrop collects it when you confirm the booking.</p>
        <div className={s.deadline}><Icon name="clock"/><span>Respond by <time dateTime={r.respondBy}>{deadline.format(new Date(r.respondBy))} UK time</time></span></div>
        <label className={s.check}><input type="checkbox" checked={checked} disabled={busy} onChange={e=>onCheck(e.target.checked)}/>I can collect within the agreed window.</label>
        {error && <p className="availabilityError" role="alert">{error}</p>}
        <button type="button" className={s.primary} onClick={onConfirm} disabled={!checked || busy}>Confirm &amp; secure booking</button>
        <button type="button" className={s.secondary} onClick={onDecline} disabled={busy}>Decline — no fine</button>
      </>}
    </div>
  </article>;
}
