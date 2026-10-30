export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Music Solana",
    "description": "Explore music project funding and revenue deposits on Solana devnet with test SOL",
    "url": "https://musicsolana.web.app",
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
      "name": "Music Solana",
      "url": "https://musicsolana.web.app"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
