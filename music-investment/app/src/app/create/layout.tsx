import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Devnet Lab",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://musicsolana.web.app/create/" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
