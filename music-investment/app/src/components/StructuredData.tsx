export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Musicsolana",
    "description": "Invest in music projects and earn revenue share on Solana blockchain",
    "url": "https://musicsolana.app",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Music project investment",
      "Revenue share distribution",
      "Blockchain-based transparency",
      "Artist funding platform"
    ],
    "provider": {
      "@type": "Organization",
      "name": "Musicsolana",
      "url": "https://musicsolana.app"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
