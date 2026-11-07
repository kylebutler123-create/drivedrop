import type {MetadataRoute} from 'next';
import {isProductionSite, publicPages, SITE_URL} from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProductionSite()) return [];
  // Do not invent modification dates or include account, booking or preview URLs.
  return Object.keys(publicPages).map(path => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
  }));
}
