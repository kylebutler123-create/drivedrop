import type {MetadataRoute} from 'next';
import {isProductionSite, SITE_URL} from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  if (!isProductionSite()) return {rules: {userAgent: '*', disallow: '/'}};
  // Workspace pages can be crawled to read their noindex metadata. Authentication
  // remains the access control; robots.txt is not a privacy/security boundary.
  return {
    rules: {userAgent: '*', allow: '/', disallow: '/api/'},
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
