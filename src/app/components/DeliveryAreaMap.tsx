import {useState} from 'react';
import type {DeliveryMapArea, DeliveryMapAreas} from '@/lib/delivery-map-areas';

const height = 200;
const tileSize = 256;

function mercator({lat, lon}: DeliveryMapArea) {
  const radians = lat * Math.PI / 180;
  return {x: (lon + 180) / 360, y: (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2};
}

export default function DeliveryAreaMap({areas, width}: {areas: DeliveryMapAreas; width: number}) {
  const [tileFailed, setTileFailed] = useState(false);
  if (tileFailed) return <p className="ddMapNotice" role="status">The road map couldn’t load. Open in Maps for directions.</p>;
  const a = mercator(areas.collection), b = mercator(areas.delivery);
  const scale = Math.min((width - 52) / Math.abs(b.x - a.x), (height - 72) / Math.abs(b.y - a.y));
  const zoom = Math.max(0, Math.min(15, Math.floor(Math.log2(scale / tileSize))));
  const world = tileSize * 2 ** zoom;
  const left = (a.x + b.x) * world / 2 - width / 2;
  const top = (a.y + b.y) * world / 2 - height / 2;
  const tiles = [];
  for (let x = Math.floor(left / tileSize); x < Math.ceil((left + width) / tileSize); x++) {
    for (let y = Math.floor(top / tileSize); y < Math.ceil((top + height) / tileSize); y++) {
      tiles.push(<img key={`${zoom}/${x}/${y}`} alt="" width="256" height="256" draggable={false}
        style={{left: x * tileSize - left, top: y * tileSize - top}}
        src={`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`} referrerPolicy="strict-origin-when-cross-origin" onError={() => setTileFailed(true)}/>);
    }
  }
  const together = Math.hypot(a.x - b.x, a.y - b.y) * world < 25;
  const marker = (p: typeof a, label: string) => <span key={label} aria-hidden="true" className={`ddAreaPin${label === 'B' ? ' isDelivery' : ''}`} style={{left: p.x * world - left, top: p.y * world - top}}>{label}</span>;
  return <div className="ddAreaMap" role="group" aria-label={`Road map showing collection near ${areas.collection.label} and delivery near ${areas.delivery.label}`}>
    {tiles}{together ? marker({x:(a.x+b.x)/2,y:(a.y+b.y)/2}, 'A/B') : [marker(a, 'A'), marker(b, 'B')]}
    <span className="ddAreaCredit"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · <a href="https://postcodes.io/docs/licences/" target="_blank" rel="noreferrer">Location data</a></span>
  </div>;
}
