'use client';
import TransporterSummaryDecoration from './TransporterSummaryDecoration';
export default function TransporterQuotesSummary({count,selected,onSelect}:{count:number|null;selected:boolean;onSelect:()=>void}){
 return <button type="button" role="button" className="transporterQuotesSummary" data-my-quotes-summary="true" aria-pressed={selected} aria-controls="my-quoted-jobs" onClick={onSelect}><strong>{count??'—'}</strong><span>My quotes</span><TransporterSummaryDecoration icon="quotes"/></button>;
}
