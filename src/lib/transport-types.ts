export const transportTypeValues=['ANY','DRIVEN','OPEN','ENCLOSED'] as const;

export type TransportType=(typeof transportTypeValues)[number];

export const transportTypes=[
  {value:'ANY',label:'Any'},
  {value:'DRIVEN',label:'Driven 👨'},
  {value:'OPEN',label:'Open transport 🛻'},
  {value:'ENCLOSED',label:'Enclosed transport 🚛'},
] as const satisfies ReadonlyArray<{value:TransportType;label:string}>;

export function transportTypeCategory(value:unknown):TransportType{
  const type=typeof value==='string'?value.trim().toLowerCase():'';
  switch(type){
    case 'driven':return 'DRIVEN';
    case 'open':
    case 'open transport':return 'OPEN';
    case 'enclosed':
    case 'enclosed transport':return 'ENCLOSED';
    default:return 'ANY';
  }
}

export function transportTypeDisplay(value:unknown):string{
  const category=transportTypeCategory(value);
  return transportTypes.find(type=>type.value===category)?.label||'Any';
}
