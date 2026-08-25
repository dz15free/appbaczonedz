import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  alternates: { canonical: "/community" },
};

export default function PrivateRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
