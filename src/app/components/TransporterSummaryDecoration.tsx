type SummaryIcon='truck'|'file'|'circleCheck'|'cancelled'|'quotes';
const paths:Record<SummaryIcon,string>={
 truck:'M7 5h10v12H7M17 9h4l3 5v3h-3M1 8h4M0 12h4M2 16h3M11 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0m10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0M11 18h6',
 file:'M5 2h11l4 4v16H5ZM16 2v5h4M9 11h7M9 16h7',
 circleCheck:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M7 12l3 3 7-7',
 cancelled:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M8 8l8 8M16 8l-8 8',
 quotes:'M12 22H3V2h11l4 4v5M14 2v5h4M7 10h6M7 14h3m3 4 7-7 3 3-7 7-4 1ZM18 13l3 3'
};
export default function TransporterSummaryDecoration({icon}:{icon:SummaryIcon}){
 return <span className="transporterSummaryDecoration" aria-hidden="true"><svg className="approvedIcon" viewBox="0 0 26 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[icon]}/></svg><svg className="transporterSummaryChevron" viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 4 6 6-6 6"/></svg></span>;
}
