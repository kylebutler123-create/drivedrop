export const vehicleTypes=[
  'Car',
  'Van',
  'Motorcycle',
  'Classic / prestige',
  'Motorhome / campers',
  'Caravan / trailers',
  'Plant / farm',
  'Other vehicles',
] as const;

export type VehicleType=(typeof vehicleTypes)[number];

export function vehicleTypeCategory(value:unknown):VehicleType|null{
  const type=typeof value==='string'?value.trim().toLowerCase():'';
  switch(type){
    case 'car':return 'Car';
    case 'van':return 'Van';
    case 'motorcycle':return 'Motorcycle';
    case 'classic':
    case 'classic / prestige':
    case 'classic / prestige vehicle':return 'Classic / prestige';
    case 'motor home':
    case 'motor_home':
    case 'motorhome':
    case 'motorhome / campers':return 'Motorhome / campers';
    case 'caravan':
    case 'trailer':
    case 'trailers':
    case 'caravan / trailer':
    case 'caravan / trailers':return 'Caravan / trailers';
    case 'plant machine':
    case 'plant machinery':
    case 'farm machine':
    case 'farm machinery':
    case 'plant / farm':
    case 'plant / farm machine':
    case 'plant / farm machinery':return 'Plant / farm';
    case 'other':
    case 'other vehicle':
    case 'other vehicles':
    case 'truck':return 'Other vehicles';
    default:return null;
  }
}

export function vehicleTypeDisplay(value:unknown):string{
  const original=typeof value==='string'?value.trim():'';
  if(!original)return 'Not specified';
  // Retain the older truck label while normalising previous category names.
  if(original.toLowerCase()==='truck')return original;
  return vehicleTypeCategory(original)||original;
}
