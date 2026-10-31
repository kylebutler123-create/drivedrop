'use client';

import {useEffect, useRef, useState} from 'react';
import type {DeliveryMapAreas} from '@/lib/delivery-map-areas';
import DeliveryAreaMap from './DeliveryAreaMap';
import '../mobile-delivery-map.css';

const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?.trim();
function ukAddress(address: string) {
  const trimmed = address.trim();
  return /\b(?:UK|United Kingdom|Great Britain|England|Scotland|Wales|Northern Ireland)\s*$/i.test(trimmed)
    ? trimmed : `${trimmed}, UK`;
}

type Props = {id: string; collection?: string; delivery?: string};
export default function MobileDeliveryMap({id, collection = '', delivery = ''}: Props) {
  const container = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const [areas, setAreas] = useState<DeliveryMapAreas | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const complete = Boolean(collection.trim() && delivery.trim());

  useEffect(() => {
    const section = container.current;
    if (!section || !complete) return;
    const measure = new ResizeObserver(() => setWidth(section.clientWidth));
    measure.observe(section);
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {setVisible(true); observer.disconnect();}
    });
    observer.observe(section);
    return () => {measure.disconnect(); observer.disconnect();};
  }, [complete]);

  useEffect(() => {
    if (embedKey || !visible || !complete) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/bookings/${encodeURIComponent(id)}/map-areas`, {signal: controller.signal, cache: 'no-store'});
        if (!response.ok) throw new Error('Map areas unavailable');
        const data: DeliveryMapAreas = await response.json();
        if (!controller.signal.aborted) setAreas(data);
      } catch {
        if (!controller.signal.aborted) setUnavailable(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [visible, complete, id]);

  if (!complete) return <section className="ddDeliveryMap"><h3>Map</h3><p className="ddMapNotice">A collection and delivery address are needed to show this map.</p></section>;
  const stops = {origin: ukAddress(collection), destination: ukAddress(delivery)};
  const directions = 'https://www.google.com/maps/dir/?' + new URLSearchParams({api: '1', ...stops, travelmode: 'driving'});
  const embed = embedKey && 'https://www.google.com/maps/embed/v1/directions?' + new URLSearchParams({key: embedKey, ...stops, mode: 'driving', maptype: 'roadmap', units: 'imperial', region: 'gb', language: 'en'});
  return <section className="ddDeliveryMap" ref={container} aria-label="Delivery map">
    <h3>{embed ? 'Planned route' : 'Map'}</h3>
    <div className="ddDeliveryMapCanvas">
      {embed && visible ? <iframe title={`Planned driving route from ${collection} to ${delivery}`} src={embed} referrerPolicy="strict-origin-when-cross-origin" loading="lazy"/> :
        areas && width > 0 ? <DeliveryAreaMap areas={areas} width={width}/> :
          <p className="ddMapNotice" role="status">{unavailable ? 'Use Open in Maps for directions between these addresses.' : 'Loading road map…'}</p>}
    </div>
    <div className="ddDeliveryMapFooter"><span>{embed ? 'Driving route' : areas ? 'A · Collection area　B · Delivery area' : 'Collection to delivery'}</span><a href={directions} target="_blank" rel="noopener noreferrer">Open in Maps <span aria-hidden="true">↗</span></a></div>
  </section>;
}
