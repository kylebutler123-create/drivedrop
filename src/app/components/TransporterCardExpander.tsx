'use client';
import {useEffect} from 'react';
import type {JobOrigin} from '@/lib/job-locations';
import type {NearbyAction} from './MobileNearbyJobs';
import {usePathname} from 'next/navigation';
import {renderJobDistanceBadge} from './TransporterJobDistanceBadge';
import {vehicleTypes,vehicleTypeCategory,vehicleTypeDisplay} from '@/lib/vehicle-types';
import {transportTypes,transportTypeCategory} from '@/lib/transport-types';
function text(el:Element|null){return (el?.textContent||'').replace(/\s+/g,' ').trim()}
function norm(value:any){return String(value??'').replace(/\s+/g,' ').trim().toLowerCase()}
function escapeHtml(value:any){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c))}
function bookingReference(value:any){const id=String(value??'').trim();return id?`DD-${id.slice(-8).toUpperCase()}`:'Not available'}
const jobDefaultOrder=new WeakMap<HTMLElement,number>();
let nextJobOrder=0;
const jobDistanceRequests=new WeakMap<HTMLElement,AbortController>();
function cancelJobDistanceSearch(bar:HTMLElement|null){
  if(!bar)return;
  const request=jobDistanceRequests.get(bar);
  jobDistanceRequests.delete(bar);
  request?.abort();
}

function detailValue(card:HTMLElement,label:string){const rows=Array.from(card.querySelectorAll<HTMLElement>('.activeVehicleDetailsGrid>span'));const row=rows.find(x=>text(x.querySelector('small')).toLowerCase()===label.toLowerCase());return text(row?.querySelector('b')||null)}
function deliveryFacts(card:HTMLElement,booking?:any){const job=booking?.job||{};const vehicleType=vehicleTypeDisplay(job.vehicleType||detailValue(card,'Vehicle type'));const registration=job.registration||detailValue(card,'Registration')||'Not provided';const running=typeof job.running==='boolean'?(job.running?'Runs & drives':'Non-running'):(detailValue(card,'Running condition')||'Not specified');const rawDate=booking?.agreedCollectionDate||job.collectionDate;const date=rawDate?new Date(rawDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):(text(card.querySelector('.agreedCollectionDate strong'))||detailValue(card,'Collection date')||'Not specified');const proceeds=text(card.querySelector('.paymentMini strong'))||'—';const reference=bookingReference(booking?.id||card.dataset.bookingId);return `<span class="transporterCollapsedFacts transporterDeliveryFacts"><span><small>Vehicle</small><b>${escapeHtml(vehicleType)}</b></span><span><small>Reg</small><b>${escapeHtml(registration)}</b></span><span><small>Date</small><b>${escapeHtml(date)}</b></span><span><small>Condition</small><b>${escapeHtml(running)}</b></span><span class="wide transporterDeliveryReference"><small>Delivery reference</small><b>${escapeHtml(reference)}</b></span><span class="wide"><small>Proceeds</small><b>${escapeHtml(proceeds)}</b></span></span>`}
function refreshDeliveryFacts(card:HTMLElement,booking?:any){const main=card.querySelector<HTMLElement>('.transporterCardSummaryMain');if(!main)return;const html=deliveryFacts(card,booking);const existing=main.querySelector<HTMLElement>('.transporterDeliveryFacts');if(existing?.outerHTML===html)return;existing?.remove();main.insertAdjacentHTML('beforeend',html)}
function applyJobMetadata(card:HTMLElement,job?:any){if(!job)return;if(job.id)card.dataset.jobId=String(job.id);if(job.vehicleType)card.dataset.vehicleType=String(job.vehicleType);if(job.transportType)card.dataset.transportType=String(job.transportType);if(job.collectionDate)card.dataset.collectionDate=String(job.collectionDate);if(job.createdAt)card.dataset.createdAt=String(job.createdAt)}
function findBooking(card:HTMLElement,index:number,bookings:any[]){const title=norm(card.querySelector('.bookingTop h2')?.textContent);const stops=Array.from(card.querySelectorAll('.routeVisual b')).slice(0,2).map(x=>norm(x.textContent));const exact=bookings.find((b:any)=>{const job=b.job||{};const sameTitle=norm(`${job.vehicleMake||''} ${job.vehicleModel||''}`)===title;const sameRoute=stops.length<2||(norm(job.collection)===stops[0]&&norm(job.delivery)===stops[1]);return sameTitle&&sameRoute});if(exact)return exact;const routeMatch=bookings.find((b:any)=>stops.length>=2&&norm(b.job?.collection)===stops[0]&&norm(b.job?.delivery)===stops[1]);if(routeMatch)return routeMatch;const titleMatch=bookings.find((b:any)=>norm(`${b.job?.vehicleMake||''} ${b.job?.vehicleModel||''}`)===title);return titleMatch||bookings[index]||null}
const quoteAmountFormat=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
function refreshJobQuoteAmount(card:HTMLElement){
  const main=card.querySelector<HTMLElement>(':scope > .transporterCardToggle .transporterCardSummaryMain');
  if(!main)return;
  const existing=main.querySelector<HTMLElement>('.transporterJobQuoteAmount');
  const raw=card.dataset.ownQuotePricePence;
  const pricePence=Number(raw);
  if(card.dataset.hasOwnQuote!=='true'||!raw?.trim()||!Number.isSafeInteger(pricePence)||pricePence<0){
    existing?.remove();
    return;
  }
  const label=`Your quote: ${quoteAmountFormat.format(pricePence/100)}`;
  if(existing){
    if(existing.textContent!==label)existing.textContent=label;
    return;
  }
  const title=main.querySelector(':scope > strong');
  if(!title)return;
  const amount=document.createElement('span');
  amount.className='transporterJobQuoteAmount';
  amount.textContent=label;
  title.insertAdjacentElement('afterend',amount);
}
function jobQuoteSummary(card:HTMLElement,job?:any){
  const quoted=card.dataset.hasOwnQuote===undefined
    ?(job?.quotes||[]).length>0
    :card.dataset.hasOwnQuote==='true';
  return quoted?'Already quoted':'Not yet quoted';
}
function refreshJobCounterDateAlert(card:HTMLElement){
  const awaiting=card.dataset.hasCustomerCounterDate==='true';
  card.classList.toggle('hasCustomerCounterDate',awaiting);
  const main=card.querySelector<HTMLElement>(':scope > .transporterCardToggle .transporterCardSummaryMain');
  if(!main)return;
  const quoteLabel=jobQuoteSummary(card);
  const status=main.querySelector<HTMLElement>('.transporterCardSummaryStatus');
  const statusLabel=awaiting?'Action needed · Customer proposed a new date':quoteLabel==='Already quoted'?'Open for quotes · Already quoted':'Open for quotes';
  if(status&&status.textContent!==statusLabel)status.textContent=statusLabel;
  const summary=card.querySelector<HTMLElement>(':scope > .transporterCardToggle .transporterCardSummarySide > b');
  const sideLabel=awaiting?'Response needed':quoteLabel;
  if(summary&&summary.textContent!==sideLabel)summary.textContent=sideLabel;
  const existing=main.querySelector<HTMLElement>('.transporterCounterDateAlert');
  if(!awaiting){
    existing?.remove();
    return;
  }
  const rawDate=card.dataset.customerCounterDate;
  const parsedDate=rawDate?new Date(rawDate):null;
  const dateLabel=parsedDate&&Number.isFinite(parsedDate.getTime())
    ?parsedDate.toLocaleDateString('en-GB',{day:'numeric',month:'short'})
    :'new date';
  const label=`Action needed · Customer proposed ${dateLabel}`;
  if(existing){
    if(existing.textContent!==label)existing.textContent=label;
    return;
  }
  const alert=document.createElement('span');
  alert.className='transporterCounterDateAlert';
  alert.textContent=label;
  const quoteAmount=main.querySelector('.transporterJobQuoteAmount');
  if(quoteAmount)quoteAmount.insertAdjacentElement('afterend',alert);
  else main.querySelector(':scope > strong')?.insertAdjacentElement('afterend',alert);
}
function refreshDeliveryStatus(card:HTMLElement){
 const value=card.dataset.bookingStatusLabel;
 const status=card.querySelector<HTMLElement>('.transporterCardSummaryStatus');
 if(value&&status&&status.textContent!==value)status.textContent=value;
}
function enhance(card:HTMLElement,job?:any,booking?:any){if(card.classList.contains('jobOpportunity')){applyJobMetadata(card,job);refreshJobCounterDateAlert(card);return}const existingToggle=card.querySelector<HTMLElement>(':scope > .transporterCardToggle');if(card.dataset.transporterExpandable==='true'&&existingToggle){applyJobMetadata(card,job);if(card.classList.contains('transporterBooking')){refreshDeliveryFacts(card,booking);refreshDeliveryStatus(card)}if(card.classList.contains('jobOpportunity')){refreshJobQuoteAmount(card);refreshJobCounterDateAlert(card)}return}if(card.dataset.transporterExpandable==='true'&&!existingToggle){delete card.dataset.transporterExpandable;card.classList.remove('transporterExpandableCard','isCollapsed')}card.dataset.transporterExpandable='true';card.classList.add('transporterExpandableCard','isCollapsed');applyJobMetadata(card,job);const btn=document.createElement('button');btn.type='button';btn.className='transporterCardToggle';btn.setAttribute('aria-expanded','false');const status=text(card.querySelector('.statusPill'));const title=text(card.querySelector('.bookingTop h2'))||'DriveDrop card';const partner=text(card.querySelector('.bookingPartner'));const route=card.querySelector('.routeVisual');const routeStops=route?Array.from(route.querySelectorAll('b')).map(x=>text(x)).filter(Boolean):[];const proceeds=text(card.querySelector('.paymentMini strong'));const kind=card.classList.contains('jobOpportunity')?'job':'delivery';const routeSummary=routeStops.length>=2?`<span class="transporterRouteSummary"><span><small>Collection</small><b>${escapeHtml(routeStops[0])}</b></span><i>→</i><span><small>Delivery</small><b>${escapeHtml(routeStops[1])}</b></span></span>`:`<span class="transporterRouteSummary"><span><small>Route</small><b>${escapeHtml(partner||'View route')}</b></span></span>`;let stat=kind==='job'?jobQuoteSummary(card,job):(proceeds?`Proceeds · ${proceeds}`:partner||'View delivery');let quickFacts=kind==='delivery'?deliveryFacts(card,booking):'';if(kind==='job'&&job){quickFacts=`<span class="transporterCollapsedFacts"><span><small>Vehicle</small><b>${escapeHtml(vehicleTypeDisplay(job.vehicleType))}</b></span><span><small>Reg</small><b>${escapeHtml(job.registration||'Not provided')}</b></span><span><small>Date</small><b>${job.collectionDate?new Date(job.collectionDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'Not provided'}</b></span><span><small>Condition</small><b>${job.running?'Runs & drives':'Non-running'}</b></span></span>`}btn.innerHTML=`<span class="transporterCardSummaryMain"><span class="transporterCardSummaryStatus">${escapeHtml(kind==='job'?(stat==='Already quoted'?'Open for quotes · Already quoted':'Open for quotes'):(status||'Delivery'))}</span><strong>${escapeHtml(title)}</strong>${routeSummary}${quickFacts}</span><span class="transporterCardSummarySide"><b>${escapeHtml(stat)}</b><span class="transporterCardChevron">+</span></span>`;const toggle=()=>{const collapsed=card.classList.toggle('isCollapsed');btn.setAttribute('aria-expanded',collapsed?'false':'true');const c=btn.querySelector('.transporterCardChevron');if(c)c.textContent=collapsed?'+':'−'};btn.addEventListener('click',toggle);if(kind==='delivery'){card.addEventListener('drivedrop:agreed-date-ready',()=>refreshDeliveryFacts(card,booking));card.addEventListener('drivedrop:vehicle-details-ready',()=>refreshDeliveryFacts(card,booking))}card.insertBefore(btn,card.firstChild);if(kind==='delivery')refreshDeliveryStatus(card);if(kind==='job'){refreshJobQuoteAmount(card);refreshJobCounterDateAlert(card)}}
function updateJobFilterEmptyState(section:HTMLElement,bar:HTMLElement,total:number,visible:number,distanceActive:boolean,vehicleFiltered:boolean,transportFiltered:boolean){
  const existing=section.querySelector<HTMLElement>('[data-job-filter-empty]');
  if(total===0||visible>0||(!distanceActive&&!vehicleFiltered&&!transportFiltered)){
    existing?.remove();
    return;
  }
  const guidance=distanceActive
    ?(vehicleFiltered||transportFiltered?'Try a wider radius, a different postcode, Any transport type, or All vehicle types.':'Try a wider radius, a different postcode, or Clear distance.')
    :'Try choosing Any transport type or All vehicle types to see the available jobs.';
  if(existing){
    const description=existing.querySelector('p');
    if(description&&description.textContent!==guidance)description.textContent=guidance;
    return;
  }
  const empty=document.createElement('div');
  empty.dataset.jobFilterEmpty='true';
  empty.className='dashboardCard emptyState';
  empty.setAttribute('role','status');
  empty.setAttribute('aria-atomic','true');
  const title=document.createElement('h3');
  title.textContent='No jobs match your filters';
  const description=document.createElement('p');
  description.textContent=guidance;
  empty.append(title,description);
  bar.insertAdjacentElement('afterend',empty);
}
function ensureJobFilters(){const section=document.getElementById('available-jobs');const heading=section?.querySelector('.dashboardSectionHeading');if(!section||!heading)return;let bar=section.querySelector<HTMLElement>('[data-job-filters]');if(!bar){
 bar=document.createElement('div');
 bar.dataset.jobFilters='true';bar.id='dd-job-filters';
 bar.className='transporterJobFilters';
 bar.innerHTML=`
  <div class="transporterJobFiltersHeader">
   <strong><svg class="jobFilterHeadingIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 5h18M3 12h18M3 19h18"/><circle cx="8" cy="5" r="2" fill="#eaf1f8"/><circle cx="16" cy="12" r="2" fill="#eaf1f8"/><circle cx="10" cy="19" r="2" fill="#eaf1f8"/></svg>Filter available jobs</strong>
   <span data-filter-result aria-live="polite"></span>
  </div>
  <div class="transporterJobFiltersBody">
   <label class="transporterJobFilterField">Vehicle type
    <select data-vehicle-select aria-label="Filter available jobs by vehicle type">${['ALL',...vehicleTypes].map(type=>`<option value="${escapeHtml(type)}">${type==='ALL'?'All vehicle types':escapeHtml(type)}</option>`).join('')}</select>
   </label>
   <label class="transporterJobFilterField">Transport type
    <select data-transport-select aria-label="Filter available jobs by transport type">${transportTypes.map(type=>`<option value="${escapeHtml(type.value)}">${type.value==='ANY'?'Any transport type':escapeHtml(type.label)}</option>`).join('')}</select>
   </label>
   <span class="transporterJobFilterSectionLabel">Distance from you</span>
   <div class="transporterJobFilterDistance">
    <label class="transporterJobFilterField">Your postcode
     <input data-postcode-input placeholder="e.g. B1 1AA" maxlength="16"/>
    </label>
    <label class="transporterJobFilterField">Radius
     <select data-radius-select aria-label="Filter available jobs by collection radius"><option value="10">10 miles</option><option value="25" selected>25 miles</option><option value="50">50 miles</option><option value="75">75 miles</option><option value="100">100 miles</option><option value="150">150 miles</option><option value="200">200 miles</option></select>
    </label>
   </div>
   <div class="transporterJobFilterActions">
    <button type="button" data-apply-distance class="btn orange">Apply distance</button>
    <button type="button" data-clear-distance class="btn light" style="display:none">Clear</button>
   </div>
   <div class="transporterJobFilterDivider" aria-hidden="true"></div>
   <label class="transporterJobFilterField transporterJobFilterSort">Sort by
    <select data-sort-select aria-label="Sort available jobs"><option value="COLLECTION_DATE" selected>Soonest first</option><option value="NEAREST">Nearest collection</option><option value="NEWEST">Newest request</option></select>
   </label>
   <div class="transporterJobFiltersFooter">
    <svg class="jobFilterHelperIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg><span data-distance-message>Vehicle and transport filters update automatically. Apply distance to filter by postcode.</span>
    <strong data-filter-footer-count></strong>
   </div>
  </div>`;
 heading.insertAdjacentElement('afterend',bar);
}
 const vehicle=bar.querySelector<HTMLSelectElement>('[data-vehicle-select]')!;const transport=bar.querySelector<HTMLSelectElement>('[data-transport-select]')!;const postcode=bar.querySelector<HTMLInputElement>('[data-postcode-input]')!;const radius=bar.querySelector<HTMLSelectElement>('[data-radius-select]')!;const sort=bar.querySelector<HTMLSelectElement>('[data-sort-select]')!;const applyBtn=bar.querySelector<HTMLButtonElement>('[data-apply-distance]')!;const clearBtn=bar.querySelector<HTMLButtonElement>('[data-clear-distance]')!;const result=bar.querySelector<HTMLElement>('[data-filter-result]')!;const footerCount=bar.querySelector<HTMLElement>('[data-filter-footer-count]')!;const message=bar.querySelector<HTMLElement>('[data-distance-message]')!;
 const updateDistanceMessage=()=>{
   if(!bar?.dataset.distanceActive)return;
   const origin=bar.dataset.distanceOrigin||bar.dataset.distancePostcode;
   if(!origin)return;
   const normalizePostcode=(value:string)=>value.replace(/\s+/g,'').toUpperCase();
   const changed=!!bar.dataset.distancePostcode&&normalizePostcode(postcode.value)!==normalizePostcode(bar.dataset.distancePostcode);
   const notice=`Showing collection points within ${radius.value} miles of ${origin}.${changed?' Postcode changed — press Apply distance to update the results.':''}`;
   if(message.textContent!==notice)message.textContent=notice;
 };
 const sortCards=()=>{const cards=Array.from(section.querySelectorAll<HTMLElement>('.jobOpportunity'));cards.forEach(card=>{if(!jobDefaultOrder.has(card))jobDefaultOrder.set(card,nextJobOrder++)});if(sort.value==='NEAREST'&&!bar?.dataset.distanceActive){const hint='Apply a postcode distance first to sort by nearest collection.';if(message.textContent!==hint)message.textContent=hint;return}const original=new Map(cards.map((card,i)=>[card,i]));cards.sort((a,b)=>{if(sort.value==='NEAREST'){const av=Number(a.dataset.distanceMiles||Number.POSITIVE_INFINITY),bv=Number(b.dataset.distanceMiles||Number.POSITIVE_INFINITY);return av-bv}if(sort.value==='COLLECTION_DATE'){const av=new Date(a.dataset.collectionDate||'9999-12-31').getTime(),bv=new Date(b.dataset.collectionDate||'9999-12-31').getTime();return av-bv}if(sort.value==='NEWEST'){const av=new Date(a.dataset.createdAt||0).getTime(),bv=new Date(b.dataset.createdAt||0).getTime();return bv-av}if(sort.value==='VEHICLE')return (a.dataset.vehicleType||'').localeCompare(b.dataset.vehicleType||'');return (jobDefaultOrder.get(a)??0)-(jobDefaultOrder.get(b)??0)});if(cards.some((card,i)=>original.get(card)!==i))cards.forEach(card=>section.appendChild(card))};
 const search=section.querySelector<HTMLInputElement>('[data-mobile-job-search]');
 const mobileSort=section.querySelector<HTMLSelectElement>('[data-mobile-job-sort]');
 const emitState=(count:number,total:number,force=false)=>{
  const state={count,total,active:!!bar!.dataset.distanceActive,origin:bar!.dataset.distanceOrigin||'',radius:Number(radius.value),busy:bar!.dataset.nearbyBusy==='true',error:bar!.dataset.nearbyError||'',unlocated:Number(bar!.dataset.unlocatedCount||0)};
  const signature=JSON.stringify(state);if(!force&&bar!.dataset.nearbyState===signature)return;
  bar!.dataset.nearbyState=signature;section.dispatchEvent(new CustomEvent('drivedrop:nearby-state',{detail:state}));
 };
 const applyFilters=(force=false)=>{
  sortCards();let visible=0;const cards=section.querySelectorAll<HTMLElement>('.jobOpportunity');
  cards.forEach(card=>{
   renderJobDistanceBadge(card);
   const vehicleOk=vehicle.value==='ALL'||vehicleTypeCategory(card.dataset.vehicleType)===vehicle.value;
   const transportOk=transport.value==='ANY'||transportTypeCategory(card.dataset.transportType)===transport.value;
   const raw=card.dataset.distanceMiles;
   const distanceOk=!bar!.dataset.distanceActive||(raw!==undefined&&raw!==''&&Number.isFinite(Number(raw))&&Number(raw)<=Number(radius.value));
   const query=search?.value.trim().toLowerCase()||'';
   const searchOk=!query||(card.textContent||'').toLowerCase().includes(query);
   const show=vehicleOk&&transportOk&&distanceOk&&searchOk;card.style.display=show?'':'none';if(show)visible++;
  });
  const footerLabel=`${visible} job${visible===1?'':'s'}`;const count=`${footerLabel} shown`;
  if(mobileSort&&mobileSort.value!==sort.value)mobileSort.value=sort.value;
  if(result.textContent!==count)result.textContent=count;if(footerCount.textContent!==footerLabel)footerCount.textContent=footerLabel;
  updateJobFilterEmptyState(section,bar!,cards.length,visible,!!bar!.dataset.distanceActive,vehicle.value!=='ALL'||!!search?.value.trim(),transport.value!=='ANY');
  emitState(visible,cards.length,force);
 };
 const cardsKey=()=>JSON.stringify(Array.from(section.querySelectorAll<HTMLElement>('.jobOpportunity')).map(card=>[card.dataset.jobId,text(card.querySelector('.routeVisual b'))]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
 const cancelSearch=()=>{cancelJobDistanceSearch(bar);delete bar!.dataset.nearbyBusy;applyBtn.disabled=false;applyBtn.textContent='Apply distance'};
 const clearDistance=()=>{
  cancelSearch();for(const key of ['distanceActive','distancePostcode','distanceOrigin','distanceSearch','distanceCheckKey','nearbyError','unlocatedCount'])delete bar!.dataset[key];
  section.querySelectorAll<HTMLElement>('.jobOpportunity').forEach(card=>{delete card.dataset.distanceMiles;delete card.dataset.distanceOrigin;delete card.dataset.radiusId});
  clearBtn.style.display='none';message.textContent='Distance filter cleared.';if(sort.value==='NEAREST')sort.value='COLLECTION_DATE';applyFilters();
 };
 const runDistance=async(origin:JobOrigin,nextRadius:number)=>{
  cancelSearch();const request=new AbortController();jobDistanceRequests.set(bar!,request);
  const isCurrent=()=>jobDistanceRequests.get(bar!)===request&&bar!.isConnected&&section.isConnected;
  bar!.dataset.nearbyBusy='true';delete bar!.dataset.nearbyError;bar!.dataset.distanceCheckKey=cardsKey();applyBtn.disabled=true;applyBtn.textContent='Checking distance…';message.textContent='';applyFilters();
  try{
   const cards=Array.from(section.querySelectorAll<HTMLElement>('.jobOpportunity'));
   const payloadJobs=cards.map((card,index)=>{const id=card.dataset.jobId||`visible-job-${index}`;card.dataset.radiusId=id;return {id,collection:text(card.querySelector('.routeVisual b'))}}).filter(job=>job.collection);
   let resolved=origin,label='',unlocated=0;const distances=new Map<string,number|null>();
   // Preserve the endpoint's 200-job bound while covering every loaded card.
   for(let start=0;start<Math.max(1,payloadJobs.length);start+=200){
    const response=await fetch('/api/jobs/radius',{method:'POST',signal:request.signal,headers:{'content-type':'application/json'},body:JSON.stringify({origin:resolved,jobs:payloadJobs.slice(start,start+200)})});
    const data=await response.json().catch(()=>null);if(!isCurrent())return;
    if(!response.ok||!Array.isArray(data?.distances))throw new Error(data?.error||'Unable to calculate collection distances. Please try again.');
    label=String(data.origin||'your location');unlocated+=Number(data.unlocatedCount||0);
    if(data.point)resolved={kind:'coordinates',point:data.point,label};
    for(const item of data.distances)distances.set(String(item.id),typeof item.miles==='number'&&Number.isFinite(item.miles)&&item.miles>=0?item.miles:null);
   }
   if(!isCurrent())return;
   cards.forEach(card=>{const miles=distances.get(card.dataset.radiusId||'');card.dataset.distanceMiles=typeof miles==='number'?String(miles):'';card.dataset.distanceOrigin=label});
   radius.value=String(nextRadius);bar!.dataset.distanceActive='true';bar!.dataset.distanceOrigin=label;
   bar!.dataset.distanceSearch=JSON.stringify(resolved);bar!.dataset.unlocatedCount=String(unlocated);
   if(origin.kind==='postcode'){postcode.value=origin.postcode;bar!.dataset.distancePostcode=origin.postcode}else delete bar!.dataset.distancePostcode;
   clearBtn.style.display='inline-flex';updateDistanceMessage();
  }catch(error){
   if(!isCurrent())return;
   const errorMessage=error instanceof Error?error.message:'Unable to calculate collection distances. Please try again.';
   bar!.dataset.nearbyError=errorMessage;message.textContent=errorMessage;
  }finally{
   if(isCurrent()){jobDistanceRequests.delete(bar!);delete bar!.dataset.nearbyBusy;applyBtn.disabled=false;applyBtn.textContent='Apply distance';applyFilters()}
  }
 };
 if(mobileSort&&!mobileSort.dataset.bound){mobileSort.dataset.bound='true';mobileSort.addEventListener('change',()=>{
  if(mobileSort.value==='NEAREST'&&!bar!.dataset.distanceActive){bar!.dataset.nearbyError='Choose a location and tap Find jobs before sorting by nearest collection.';section.querySelector<HTMLInputElement>('.ddNearbyInput input')?.focus();mobileSort.value=sort.value}else{sort.value=mobileSort.value;delete bar!.dataset.nearbyError}applyFilters();
 })}
 if(search&&!search.dataset.bound){search.dataset.bound='true';search.addEventListener('input',()=>applyFilters())}
 for(const control of [vehicle,transport,sort])if(!control.dataset.bound){control.dataset.bound='true';control.addEventListener('change',()=>applyFilters())}
 if(!applyBtn.dataset.bound){applyBtn.dataset.bound='true';applyBtn.addEventListener('click',()=>{
  if(!postcode.value.trim()){message.textContent='Enter your current postcode first.';return}
  void runDistance({kind:'postcode',postcode:postcode.value.trim()},Number(radius.value));
 })}
 if(!clearBtn.dataset.bound){clearBtn.dataset.bound='true';clearBtn.addEventListener('click',clearDistance)}
 if(!postcode.dataset.bound){postcode.dataset.bound='true';postcode.addEventListener('input',updateDistanceMessage)}
 if(!radius.dataset.bound){radius.dataset.bound='true';radius.addEventListener('change',()=>{if(bar!.dataset.distanceActive)updateDistanceMessage();applyFilters()})}
 if(!bar.dataset.nearbyBound){
  bar.dataset.nearbyBound='true';
  section.addEventListener('drivedrop:nearby-ready',()=>applyFilters(true));
  section.addEventListener('drivedrop:nearby-action',(event:Event)=>{
   const detail=(event as CustomEvent<NearbyAction>).detail;
   if(detail.type==='search'&&detail.origin)void runDistance(detail.origin,detail.radius||Number(radius.value));
   if(detail.type==='clear'||detail.type==='reset')clearDistance();
   if(detail.type==='reset'){vehicle.value='ALL';transport.value='ANY';sort.value='COLLECTION_DATE';radius.value='25';applyFilters()}
   if(detail.type==='cancel'){cancelSearch();delete bar!.dataset.nearbyError;applyFilters()}
   if(detail.type==='radius'&&[10,25,50,75,100,150,200].includes(detail.radius||0)){radius.value=String(detail.radius);updateDistanceMessage();applyFilters()}
  });
 }
 applyFilters();
 // New/refreshed collection addresses must be checked once; failures wait for an explicit retry.
 if(bar.dataset.distanceActive&&bar.dataset.distanceSearch&&!jobDistanceRequests.has(bar)&&bar.dataset.distanceCheckKey!==cardsKey())void runDistance(JSON.parse(bar.dataset.distanceSearch),Number(radius.value));
}
export default function TransporterCardExpander(){const pathname=usePathname();useEffect(()=>{if(pathname!=='/transporter')return;let bookings:any[]=[];let cancelled=false;let scheduled=false;const scan=()=>{scheduled=false;if(cancelled)return;const deliveryCards=Array.from(document.querySelectorAll<HTMLElement>('main.dashboardShell .transporterBooking'));deliveryCards.forEach((card,i)=>enhance(card,undefined,findBooking(card,i,bookings)));const jobCards=Array.from(document.querySelectorAll<HTMLElement>('main.dashboardShell .jobOpportunity'));jobCards.forEach(card=>enhance(card));ensureJobFilters()};const scheduleScan=()=>{if(scheduled||cancelled)return;scheduled=true;window.requestAnimationFrame(scan)};const load=async()=>{try{const response=await fetch('/api/my-bookings',{cache:'no-store'});if(response.ok){const data=await response.json();if(Array.isArray(data))bookings=data}}catch{}if(cancelled)return;scheduleScan()};load();scheduleScan();const observer=new MutationObserver(scheduleScan);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-booking-status-label','data-transport-type','data-has-own-quote','data-own-quote-price-pence','data-has-customer-counter-date','data-customer-counter-date']});return()=>{cancelled=true;observer.disconnect();cancelJobDistanceSearch(document.querySelector<HTMLElement>('[data-job-filters]'));document.querySelector('[data-job-filters]')?.remove();document.querySelector('[data-job-filter-empty]')?.remove();document.querySelectorAll<HTMLElement>('#available-jobs .jobOpportunity').forEach(card=>card.style.display='')}},[pathname]);return null}
