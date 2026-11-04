import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Transparencia y riesgos",
  alternates: { canonical: "https://musicsolana.web.app/disclosures/" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
