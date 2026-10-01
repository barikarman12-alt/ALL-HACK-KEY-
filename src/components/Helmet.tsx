import React, { useEffect } from 'react';
import { useInventory } from '../store';

export interface HelmetProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  canonicalUrl?: string;
  children?: React.ReactNode;
  schema?: Record<string, any>;
}

export function Helmet({
  title,
  description,
  keywords,
  image,
  type = 'website',
  canonicalUrl,
  children,
  schema
}: HelmetProps) {
  const { settings } = useInventory();
  const siteName = settings?.siteName || 'Arman X Store';

  useEffect(() => {
    // 1. Extract title and description from props or child elements
    let effectiveTitle = title;
    let effectiveDescription = description;

    if (children) {
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          const props = child.props as Record<string, any>;
          if (child.type === 'title' && typeof props.children === 'string') {
            effectiveTitle = props.children;
          }
          if (child.type === 'meta') {
            if (props.name === 'description' && props.content) {
              effectiveDescription = props.content;
            }
          }
        }
      });
    }

    // Default formatting
    const finalTitle = effectiveTitle 
      ? (effectiveTitle.includes(siteName) ? effectiveTitle : `${effectiveTitle} | ${siteName}`)
      : `${siteName} – VIP Digital Keys & Instant Delivery`;

    const finalDescription = effectiveDescription || 
      `Buy VIP activation keys, license subscriptions, and instant digital game codes on ${siteName}. Fast UPI payments, wallet rewards, and 24/7 key delivery.`;

    const currentUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const finalImage = image || settings?.siteLogoUrl || '/icon.svg';

    // 2. Update document title
    document.title = finalTitle;

    // 3. Helper to update or create meta tags
    const setMetaTag = (selector: string, attributeName: string, attributeValue: string, content: string) => {
      let meta = document.querySelector(selector) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attributeName, attributeValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Standard description & keywords
    setMetaTag('meta[name="description"]', 'name', 'description', finalDescription);
    if (keywords) {
      setMetaTag('meta[name="keywords"]', 'name', 'keywords', keywords);
    }

    // OpenGraph Social Cards
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', finalTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', finalDescription);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', siteName);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', type);
    if (currentUrl) {
      setMetaTag('meta[property="og:url"]', 'property', 'og:url', currentUrl);
    }
    if (finalImage) {
      setMetaTag('meta[property="og:image"]', 'property', 'og:image', finalImage);
    }

    // Twitter / X Cards
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', finalTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', finalDescription);
    if (finalImage) {
      setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', finalImage);
    }

    // Canonical link
    if (currentUrl) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', currentUrl);
    }

    // 4. Schema.org JSON-LD Structured Data
    const defaultSchema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": siteName,
      "url": currentUrl,
      "description": finalDescription,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Android, iOS, Windows, Web",
      "offers": {
        "@type": "Offer",
        "price": "40",
        "priceCurrency": "INR"
      }
    };

    const effectiveSchema = schema || defaultSchema;
    let schemaScript = document.getElementById('schema-jsonld') as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'schema-jsonld';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(effectiveSchema);

  }, [title, description, keywords, image, type, canonicalUrl, children, schema, siteName, settings?.siteLogoUrl]);

  return null;
}

export default Helmet;
