export const vehicleTypes=[
  'Car',
  'Van',
  'Motorcycle',
  'Classic / prestige vehicle',
  'Motorhome / campers',
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
    case 'classic / prestige vehicle':return 'Classic / prestige vehicle';
    case 'motor home':
    case 'motor_home':
    case 'motorhome':
    case 'motorhome / campers':return 'Motorhome / campers';
    case 'other':
    case 'other vehicle':
    case 'other vehicles':
    case 'truck':
    case 'caravan':
    case 'plant machine':
    case 'farm machine':return 'Other vehicles';
    default:return null;
  }
}

export function vehicleTypeDisplay(value:unknown):string{
  const original=typeof value==='string'?value.trim():'';
  if(!original)return 'Not specified';
  // Retain the specific type on older cards while putting it under Other in the filter.
  if(['truck','caravan','plant machine','farm machine'].includes(original.toLowerCase()))return original;
  return vehicleTypeCategory(original)||original;
}
