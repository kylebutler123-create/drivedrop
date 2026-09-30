import Icon from './ApprovedIcon';

export default function CustomerPageIcon({name}:{name:string}){
 const artwork:Record<string,React.ReactNode>={
  file:<><path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M8 12h7M8 15.5h7M8 19h7"/></>,
  users:<><circle cx="12" cy="6" r="3.6"/><circle cx="4.5" cy="9" r="2.3"/><circle cx="19.5" cy="9" r="2.3"/><path d="M6 22v-2.4a6 6 0 0 1 12 0V22ZM4.5 14a4 4 0 0 0-4 4v2h3M19.5 14a4 4 0 0 1 4 4v2h-3"/></>,
  calendar:<><rect x="2.5" y="4" width="19" height="18" rx="2"/><path d="M7 1.5v5M17 1.5v5M3 9h18"/>{[7,12,17].flatMap(x=>[13,17.5].map(y=><circle key={x+'-'+y} cx={x} cy={y} r=".7" fill="currentColor" stroke="none"/>))}</>,
  car:<><path d="m3 10 2-6a3 3 0 0 1 3-2h8a3 3 0 0 1 3 2l2 6M5 10h14M3 10h18a1 1 0 0 1 1 1v10h-4v-3H6v3H2V11a1 1 0 0 1 1-1ZM1 9h2m18 0h2"/><circle cx="6.5" cy="14" r="1.4"/><circle cx="17.5" cy="14" r="1.4"/></>,
  home:<><path d="m1.5 11 10.5-10L22.5 11M4 9v13h5v-7h6v7h5V9"/></>,
  tag:<><path d="m2 13 10-11h7l3 3v7L11 23Z"/><circle cx="17" cy="7" r="2"/></>,
  cog:<><path d="m10 1-.6 3a8 8 0 0 0-2 .9L5 3.2 2.2 6l1.7 2.4a8 8 0 0 0-.9 2L0 11v4l3 .6a8 8 0 0 0 .9 2L2.2 20 5 22.8l2.4-1.7a8 8 0 0 0 2 .9l.6 3h4l.6-3a8 8 0 0 0 2-.9l2.4 1.7 2.8-2.8-1.7-2.4a8 8 0 0 0 .9-2l3-.6v-4l-3-.6a8 8 0 0 0-.9-2L21.8 6 19 3.2l-2.4 1.7a8 8 0 0 0-2-.9L14 1Z" transform="translate(1 .1) scale(.92)"/><circle cx="12" cy="12" r="4"/></>,
  search:<><circle cx="10.5" cy="10.5" r="8"/><path d="m16.4 16.4 6 6"/></>,
  handshake:<><path d="m1 11 4-8 4 2-4 8ZM23 11l-4-8-4 2 4 8ZM8 6l3-2 4 1M6 12l2 2m11-2-5-5-3 3c-2 1-3-1-2-2l3-3M17 11l2 2c1 1 0 3-1.5 2.5M15 12l2.5 2.5c1.5 1.5-.5 3-1.5 2L13.5 14M11.5 16l2.5 2.5c1 1 3-.5 1.5-2M10 18l2 2c1 1 3-.5 2-1.5M7 13l-1 1c-1 1 0 3 1.5 2l1-1M8.5 15l-1 1c-1 1 0 3 1.5 2l1-1M10 17l-1 1c-1 1 .5 3 2 1.5"/></>,
 };
 if(!artwork[name])return <Icon name={name}/>;
 return <svg className="approvedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{artwork[name]}</svg>;
}
