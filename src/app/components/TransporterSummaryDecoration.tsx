import Icon from './ApprovedIcon';

export default function TransporterSummaryDecoration({icon}:{icon:'truck'|'file'|'circleCheck'|'cancelled'}){
 return <span className="transporterSummaryDecoration" aria-hidden="true">
  {icon==='cancelled'?<svg className="approvedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="10"/><path d="m8 8 8 8m0-8-8 8"/></svg>:<Icon name={icon}/>}
  <svg className="transporterSummaryChevron" viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 4 6 6-6 6"/></svg>
 </span>;
}
