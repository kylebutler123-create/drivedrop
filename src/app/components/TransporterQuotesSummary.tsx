'use client';
import TransporterSummaryDecoration from './TransporterSummaryDecoration';
export default function TransporterQuotesSummary({count,selected,onSelect,unread=false}:{count:number|null;selected:boolean;onSelect:()=>void;unread?:boolean}){
 return <button type="button" role="button" className="transporterQuotesSummary" data-my-quotes-summary="true" aria-pressed={selected} aria-controls="my-quoted-jobs" onClick={onSelect}><strong>{count??'—'}</strong><span>My quotes</span><TransporterSummaryDecoration icon="quotes"/>{unread&&<span className="dashboardSummaryActivity" aria-label="Unread quote activity"/>}</button>;
}
