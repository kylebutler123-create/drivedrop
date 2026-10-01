const paths = {
 car: 'M5 9 6.5 5.5A2 2 0 0 1 8.3 4h7.4a2 2 0 0 1 1.8 1.5L19 9M5 9h14a3 3 0 0 1 3 3v6h-3v2h-3v-2H8v2H5v-2H2v-6a3 3 0 0 1 3-3ZM6 13h2m8 0h2M5 17h14',
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
export function deliveryIconMarkup(name:DeliveryIconName){
 return `<svg class="deliveryDesignIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
}
export default function DeliveryDesignIcon({name}:{name:DeliveryIconName}){
 return <svg className="deliveryDesignIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
