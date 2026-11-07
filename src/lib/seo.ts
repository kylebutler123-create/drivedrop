import type {Metadata} from 'next';

// Use the public domain, never a preview URL or a request-supplied host.
export const SITE_URL = 'https://drive-drop.com';
export const SITE_NAME = 'DriveDrop';
const logo = `${SITE_URL}/mobile-app/icon-512.png`;

export const publicPages = {
  '/': {
    title: 'Car & Vehicle Transport Quotes UK | DriveDrop',
    description: 'Compare UK vehicle transport quotes from independent transporters. Request car delivery, review profiles and arrange your vehicle move with DriveDrop.',
  },
  '/get-quotes': {
    title: 'Get Vehicle Transport Quotes Across the UK | DriveDrop',
    description: 'Request free, no-obligation vehicle transport quotes. Add your collection, delivery and vehicle details to compare offers from UK transporters.',
  },
  '/for-customers': {
    title: 'Compare UK Car Delivery & Vehicle Transport | DriveDrop',
    description: 'Buying, selling or moving a vehicle? Compare UK transporter quotes, profiles and verification information, then manage your vehicle delivery in one place.',
  },
  '/for-transporters': {
    title: 'UK Vehicle Transport Jobs for Transporters | DriveDrop',
    description: 'Join DriveDrop as an independent vehicle transporter. Complete verification, quote for suitable UK transport jobs and manage your deliveries and proceeds.',
  },
  '/how-it-works': {
    title: 'How Vehicle Transport Booking Works | DriveDrop',
    description: 'Learn how to request vehicle transport quotes, compare independent transporters and manage your booking from collection through to delivery.',
  },
  '/about': {
    title: 'About Our UK Vehicle Transport Marketplace | DriveDrop',
    description: 'DriveDrop connects customers with independent vehicle transporters across the UK, bringing transport quotes, profiles and delivery records together.',
  },
  '/help': {
    title: 'Vehicle Transport Help & FAQs | DriveDrop',
    description: 'Find answers about DriveDrop vehicle transport quotes, bookings, transporter verification, collection, delivery and getting help with your journey.',
  },
  '/contact': {
    title: 'Contact DriveDrop | Vehicle Transport Support',
    description: 'Contact DriveDrop for help with your account or vehicle transport booking. Find support for customers and transporters using the UK marketplace.',
  },
  '/terms': {
    title: 'Terms & Conditions | DriveDrop',
    description: 'Read the terms for using the DriveDrop UK vehicle transport marketplace, including customer and transporter responsibilities, bookings and payments.',
  },
  '/privacy': {
    title: 'Privacy Policy | DriveDrop',
    description: 'Read how DriveDrop handles personal information when you use its UK vehicle transport marketplace, including account, booking and communication data.',
  },
} as const;

export type PublicPage = keyof typeof publicPages;

export function isProductionSite() {
  return process.env.VERCEL_ENV === 'production';
}

// New account/workspace routes remain unindexed unless explicitly opted in below.
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: 'UK vehicle transport marketplace',
  robots: {index: false, follow: false},
  verification: {google: 'sFEt5nX8vD5287y68MkBXq6-DKsMVApWiAusEQvVkMo'},
};

export function publicPageMetadata(path: PublicPage): Metadata {
  const {title, description} = publicPages[path];
  const url = `${SITE_URL}${path === '/' ? '' : path}`;
  return {
    title,
    description,
    alternates: {canonical: url},
    robots: isProductionSite()
      ? {index: true, follow: true, 'max-image-preview': 'large'}
      : {index: false, follow: false},
    openGraph: {
      type: 'website', locale: 'en_GB', siteName: SITE_NAME,
      title, description, url,
      images: [{url: logo, width: 512, height: 512, alt: 'DriveDrop logo'}],
    },
    twitter: {
      card: 'summary', title, description,
      images: [{url: logo, alt: 'DriveDrop logo'}],
    },
  };
}

// Only verified brand facts; no sample reviews, ratings, prices or delivery counts.
export const homeStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME, url: SITE_URL, logo,
      description: 'A UK marketplace connecting customers with independent vehicle transporters.',
    },
    {
      '@type': 'WebSite', '@id': `${SITE_URL}/#website`,
      name: SITE_NAME, url: SITE_URL, inLanguage: 'en-GB',
      publisher: {'@id': `${SITE_URL}/#organization`},
    },
  ],
};
