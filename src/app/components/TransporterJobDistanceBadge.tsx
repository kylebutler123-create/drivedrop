// Updated by TransporterCardExpander's existing filter pass; no extra observer or request.
export function renderJobDistanceBadge(card:HTMLElement){
  const existing=card.querySelector<HTMLElement>('[data-job-distance-badge]');
  const raw=card.dataset.distanceMiles;
  const miles=Number(raw);
  if(raw===undefined||raw.trim()===''||!Number.isFinite(miles)||miles<0){
    existing?.remove();
    return;
  }
  const summary=card.querySelector<HTMLElement>('.transporterCardSummaryMain');
  if(!summary)return;
  const rounded=miles<10?miles.toFixed(1):Math.round(miles).toString();
  const label=`${rounded} ${Number(rounded)===1?'mile':'miles'} to collection`;
  if(existing){
    if(existing.textContent!==label)existing.textContent=label;
    return;
  }
  const badge=document.createElement('span');
  badge.dataset.jobDistanceBadge='true';
  badge.textContent=label;
  badge.style.cssText='display:inline-flex;align-items:center;max-width:100%;width:max-content;box-sizing:border-box;margin-top:7px;padding:5px 9px;border-radius:999px;background:#eef5fb;color:#183654;font-size:11px;font-weight:900;line-height:1.2';
  summary.appendChild(badge);
}
