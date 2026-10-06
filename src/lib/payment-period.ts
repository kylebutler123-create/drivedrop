export type PeriodParams={year?:string;start?:string;end?:string};
export const londonDate=(value:Date|string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function proceedsPeriod(params:PeriodParams,now=new Date()){
 const currentYear=Number(londonDate(now).slice(0,4));
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 if(params.start||params.end){
  if(!params.start||!params.end||!valid(params.start)||!valid(params.end)||params.start>params.end)throw new Error('Choose a valid start and end date.');
  return {start:params.start,end:params.end,title:'Custom date range',year:null,currentYear};
 }
 const year=params.year===undefined?currentYear:Number(params.year);
 if(!Number.isInteger(year)||year<2000||year>currentYear)throw new Error('Choose a valid year.');
 return {start:year+'-01-01',end:year+'-12-31',title:String(year),year,currentYear};
}
export type ProceedsPeriod=ReturnType<typeof proceedsPeriod>;
export function inProceedsPeriod(row:{createdAt:Date|string},period:ProceedsPeriod){
 const day=londonDate(row.createdAt);return day>=period.start&&day<=period.end;
}
export const periodQuery=(period:ProceedsPeriod)=>period.year?new URLSearchParams({year:String(period.year)}):new URLSearchParams({start:period.start,end:period.end});
export const longDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'});
export const periodDescription=(period:ProceedsPeriod)=>longDate(period.start)+' – '+longDate(period.end);
