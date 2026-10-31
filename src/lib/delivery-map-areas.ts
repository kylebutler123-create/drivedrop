import {collectionPostcode, formatPostcode, postcodePoint, pointSchema, resolveJobOrigin, searchJobLocations} from './job-locations';

export type DeliveryMapArea = {lat: number; lon: number; label: string};
export type DeliveryMapAreas = {collection: DeliveryMapArea; delivery: DeliveryMapArea};

type LocationRow = {latitude: number | null; longitude: number | null};
const postcodeDistrict = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*$/i;

async function publicLookup(path: string) {
  const response = await fetch(`https://api.postcodes.io/${path}`, {
    headers: {accept: 'application/json'},
    next: {revalidate: 604800},
    signal: AbortSignal.timeout(6000),
  });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error('Location lookup unavailable');
  return (await response.json()).result;
}

function area(row: LocationRow | null, label: string): DeliveryMapArea | null {
  const point = pointSchema.safeParse({lat: row?.latitude, lon: row?.longitude});
  return point.success ? {...point.data, label} : null;
}

export async function deliveryMapArea(address: string): Promise<DeliveryMapArea | null> {
  const postcode = address.match(collectionPostcode)?.[1];
  if (postcode) {
    const label = formatPostcode(postcode);
    // Our existing address provider covers Northern Ireland commercial lookups.
    if (label.startsWith('BT')) return {...await postcodePoint(label), label};
    return area(await publicLookup(`postcodes/${encodeURIComponent(label)}`), label);
  }

  const district = address.match(postcodeDistrict)?.[1]?.toUpperCase();
  if (district && !district.startsWith('BT')) {
    return area(await publicLookup(`outcodes/${district}`), district);
  }

  // Older bookings may have just a town. Never choose between two places with the same name.
  const town = (district ? address.replace(postcodeDistrict, '') : address).trim().replace(/,$/, '').trim();
  if (!/^[\p{L}][\p{L} .’'-]{1,59}$/u.test(town)) return null;
  const places = await searchJobLocations(town);
  const matches = places.filter(place => place.name.toLowerCase() === town.toLowerCase());
  if (matches.length !== 1) return null;
  const {point, label} = await resolveJobOrigin(matches[0].origin);
  return {...point, label};
}
