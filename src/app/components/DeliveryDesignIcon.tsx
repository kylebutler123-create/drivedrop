import {vehicleTypeCategory} from '@/lib/vehicle-types';

const paths = {
 car: 'M5 9 6.5 5.5A2 2 0 0 1 8.3 4h7.4a2 2 0 0 1 1.8 1.5L19 9M5 9h14a3 3 0 0 1 3 3v6h-3v2h-3v-2H8v2H5v-2H2v-6a3 3 0 0 1 3-3ZM6 13h2m8 0h2M5 17h14',
 motorcycle: 'M8 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0M23 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 17l5-7h6l-3 7H5M16 6h3l1 11M16 10l3-1M10 10 7 8H3l2 3h4M11 13h3',
 van: 'M3 17H2V8a2 2 0 0 1 2-2h11l5 6 2 1v4h-2M7 17h9M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0M20 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0M15 8v4h5M5 12h6',
 classic: 'M4 17H2v-4l4-2 4-4h5l4 4 3 1v5h-2M8 17h8M8 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0M20 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0M8 11h10M11 8l-3 3',
 motorhome: 'M4 18H2V7h12l2-2h4l2 3v2h-6v8H8M16 18h1M21 18h2v-4l-4-4M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M21 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M5 10h4v3H5ZM11 10h3v6h-3ZM17 13h5',
 caravan: 'M7 18H2V9a4 4 0 0 1 4-4h10a3 3 0 0 1 3 3v10h-8M11 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M19 18h4m-1-2v4M5 8h6v4H5ZM14 8h3v10',
 tractor: 'M10 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0M22 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0M19 18h0M10 18h6M4 12l1-8h7l2 9h6l2 2M4 4h9M9 4v8M17 8v5M3 11h4l4 3',
 otherVehicle: 'M5 19V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14ZM5 7h14M7 13h10M9 16h6M3 8H1v4h2m18-4h2v4h-2M4 19h16M5 19v3h3v-3m8 0v3h3v-3',
 pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 user: 'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3Z',
 chat: 'M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-.8L2 22l1.8-6A9 9 0 1 1 21 11Z',
 phone: 'm7 3 3 5-3 3c1.5 3 3 4.5 6 6l3-3 5 3c0 3-2 5-5 4C8 19 3 14 2 7c-.5-3 2-5 5-4Z',
 camera: 'M3 6h4l2-3h6l2 3h4v15H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0M18 9h1',
 signature: 'm3 17 13-13 4 4L7 21l-5 1ZM13 7l4 4M3 17l4 4M18 21h4',
 chevron: 'm8 4 8 8-8 8',
 down: 'm5 9 7 7 7-7',
 arrow: 'M3 12h18m-7-7 7 7-7 7',
 alert: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v6m0 3v1',
 receipt: 'M5 2h14v20l-3-2-4 2-4-2-3 2ZM8 7h8M8 11h8M8 15h5',
} as const;
export type DeliveryIconName = keyof typeof paths;
export function vehicleTypeIcon(value:unknown):DeliveryIconName{
 switch(vehicleTypeCategory(value)){
  case 'Car':return 'car';
  case 'Motorcycle':return 'motorcycle';
  case 'Van':return 'van';
  case 'Classic / prestige':return 'classic';
  case 'Motorhome / campers':return 'motorhome';
  case 'Caravan / trailers':return 'caravan';
  case 'Plant / farm':return 'tractor';
  default:return 'otherVehicle';
 }
}
export function deliveryIconMarkup(name:DeliveryIconName){
 return `<svg class="deliveryDesignIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
}
export default function DeliveryDesignIcon({name}:{name:DeliveryIconName}){
 return <svg className="deliveryDesignIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
