import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/app',
    name: 'DriveDrop',
    short_name: 'DriveDrop',
    description: 'Your vehicle transport, all in one place.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'en-GB',
    icons: [
      {src: '/mobile-app/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
      {src: '/mobile-app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
      {src: '/mobile-app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
  };
}
