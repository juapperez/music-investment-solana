import operator from "../../public/legal/operator.json";
export default function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": operator.projectWebsite + "/#operator",
        name: operator.legalName,
        legalName: operator.legalName,
        url: operator.website,
        email: operator.contactEmail,
        foundingDate: operator.formationDate,
        identifier: operator.registrationNumber,
        address: {
          "@type": "PostalAddress",
          addressRegion: operator.jurisdiction,
          addressCountry: operator.countryCode,
        },
      },
      {
        "@type": "WebSite",
        "@id": operator.projectWebsite + "/#website",
        name: "Music Solana",
        url: operator.projectWebsite,
        inLanguage: ["es", "en"],
        publisher: { "@id": operator.projectWebsite + "/#operator" },
        description:
          "MSIX Music Index and MSAF Artist Fund: proposed music investment strategies with sourced historical context and cost scenarios. Real investing is not yet enabled.",
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
