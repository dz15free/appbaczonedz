
import type { Metadata } from "next";
import { absUrl } from "@/features/guide/site-url";

const TITLE = "مخطّط البكالوريا للطباعة — نظّم مراجعتك";
const DESC = "أنشئ مخطّط مراجعة يومياً أو أسبوعياً للبكالوريا، خصّص شكله، ثم اطبعه أو نزّله بما يناسب طريقة دراستك.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/tools/planner" },
  openGraph: { type: "website", locale: "ar_DZ", url: absUrl("/tools/planner"), title: TITLE, description: DESC, siteName: "BacZone" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
