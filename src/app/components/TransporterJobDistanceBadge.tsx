// Updated by TransporterCardExpander's filter pass; no extra observer or request.
export function renderJobDistanceBadge(card:HTMLElement){
 const raw=card.dataset.distanceMiles,miles=Number(raw);
 if(raw===undefined||raw.trim()===''||!Number.isFinite(miles)||miles<0){card.querySelectorAll('[data-job-distance-badge],.ddNearbyDistance').forEach(badge=>badge.remove());return}
 const rounded=Number(miles.toFixed(1)).toString();
 const summary=card.querySelector<HTMLElement>(':scope > .bookingTop > div')||card.querySelector<HTMLElement>('.transporterCardSummaryMain');
 if(summary){
  const desktopRounded=miles<10?miles.toFixed(1):Math.round(miles).toString();
  const label=`${desktopRounded} ${Number(desktopRounded)===1?'mile':'miles'} to collection`;
  let badge=summary.querySelector<HTMLElement>('[data-job-distance-badge]');
  if(!badge){badge=document.createElement('span');badge.dataset.jobDistanceBadge='true';badge.style.cssText='display:inline-flex;align-items:center;max-width:100%;width:max-content;box-sizing:border-box;margin-top:7px;padding:5px 9px;border-radius:999px;background:#eef5fb;color:#183654;font-size:11px;font-weight:900;line-height:1.2';summary.appendChild(badge)}
  if(badge.textContent!==label)badge.textContent=label;
 }
 const copy=card.querySelector<HTMLElement>('.ddJobCopy'),title=copy?.querySelector('h2');
 if(copy&&title){
  const origin=card.dataset.distanceOrigin||'your location',label=`${rounded} ${miles===1?'mile':'miles'} from ${origin}`;
  let badge=copy.querySelector<HTMLElement>('.ddNearbyDistance');
  if(!badge){badge=document.createElement('span');badge.className='ddNearbyDistance';badge.title='Straight-line distance to collection';badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span></span>';title.insertAdjacentElement('afterend',badge)}
  const text=badge.querySelector('span')!;if(text.textContent!==label)text.textContent=label;
 }
}
