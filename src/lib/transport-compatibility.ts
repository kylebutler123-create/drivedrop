import {vehicleTypeCategory} from '@/lib/vehicle-types';
import {transportTypeCategory} from '@/lib/transport-types';

const enclosedTransportVehicleTypes=new Set(['Car','Motorcycle','Classic / prestige']);

export const enclosedTransportCompatibilityMessage='Enclosed transport is only available for cars, motorcycles, and classic / prestige vehicles. Please choose a compatible vehicle type or another transport type.';
export const drivenTransportCompatibilityMessage='Driven transport is only available for vehicles that run and drive. For a non-running vehicle, choose Any, Open transport or a compatible Enclosed transport option.';
export function isTransportRunningCompatible(transportType:unknown,running:unknown):boolean{
 return transportTypeCategory(transportType)!=='DRIVEN'||(running!==false&&running!=='false');
}

export function isTransportVehicleCompatible(transportType:unknown,vehicleType:unknown):boolean{
 if(transportTypeCategory(transportType)!=='ENCLOSED')return true;
 const category=vehicleTypeCategory(vehicleType);
 return category!==null&&enclosedTransportVehicleTypes.has(category);
}
