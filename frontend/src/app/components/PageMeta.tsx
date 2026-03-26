import { Helmet } from 'react-helmet-async';
import { getBaseUrl } from '@/config/env';

export interface PageMetaProps {
  title: string;
  description?: string;
  /** Optional canonical URL (absolute). If not set, uses baseUrl + current pathname. */
  canonicalUrl?: string;
  /** OG/Twitter image URL (absolute). If not set, uses default /og-default.jpg. */
  image?: string;
  /** OG type, default "website". */
  ogType?: string;
}

const DEFAULT_OG_IMAGE_PATH = '/assets/og-default.jpg';

/**
 * Sets document title, meta description, canonical, Open Graph and Twitter Card tags.
 */
export function PageMeta({
  title,
  description,
  canonicalUrl,
  image,
  ogType = 'website',
}: PageMetaProps) {
  const baseUrl = getBaseUrl();
  const canonical = canonicalUrl ?? (typeof window !== 'undefined' ? `${baseUrl}${window.location.pathname}` : '');
  const imageUrl = image
    ? (image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)
    : `${baseUrl}${DEFAULT_OG_IMAGE_PATH}`;

  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={imageUrl} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:type" content={ogType} />
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}
