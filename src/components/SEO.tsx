import React from 'react';
import { Helmet } from 'react-helmet';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const defaultSEO = {
  title: 'AI Accounting Dashboard - Smart Financial Management Made Easy | WorkFusion',
  description: 'Transform your financial management with our AI-powered accounting dashboard. Save time, reduce errors, and gain real-time insights with automated bookkeeping and smart analytics.',
  keywords: 'AI accounting software, automated bookkeeping, financial management dashboard, business analytics platform, smart expense tracking, real-time financial insights, premium accounting tools',
  image: '/workfusion-og.png',
  url: 'https://workfusionapp.com',
  type: 'website'
};

export const SEO: React.FC<SEOProps> = (props) => {
  const seo = {
    ...defaultSEO,
    ...props
  };

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seo.type} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:url" content={seo.url} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
      
      {/* Additional SEO best practices */}
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={seo.url} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          'name': seo.title,
          'description': seo.description,
          'applicationCategory': 'BusinessApplication',
          'operatingSystem': 'Web',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'USD'
          }
        })}
      </script>
    </Helmet>
  );
};