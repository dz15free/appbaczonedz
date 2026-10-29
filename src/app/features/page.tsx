import Link from "next/link";
import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { SiteFooter } from "@/components/ui/site-footer";
import { FEATURE_PAGES } from "@/features/landing/features-data";
import { FEATURE_ICON } from "@/features/landing/feature-icon";
import { absUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "منصّة BacZone — الغرف والصوت والمجتمع والأدوات",
  description: "ماذا تقدّم منصّة BacZone لتلاميذ البكالوريا والأساتذة: غرف دراسة تفاعلية، صوت جماعي، مجتمع حسب المادّة، ملفّات، مساعدة ذكيّة، ونظام إنجازات.",
  alternates: { canonical: absUrl("/features") },
};

export default function FeaturesIndex() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-[var(--bz-bg)]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <h1 className="bz-rooms-h1">ما الذي تقدّمه المنصّة</h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-[1.95] text-text-muted">
            إلى جانب المقالات والأدلّة والأدوات المجّانية، يجد التلميذ والأستاذ في BacZone مساحات للدراسة معاً.
            هذه كلّ ميزة كما تعمل اليوم، بتفاصيلها.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURE_PAGES.map((f) => (
              <Link key={f.slug} href={`/features/${f.slug}`} className="bz-feature-mini is-lg">
                <span className="bz-feature-icon bz-feature-icon--sm" aria-hidden="true"><FontAwesomeIcon icon={FEATURE_ICON[f.icon]} /></span>
                <span className="min-w-0"><b>{f.title}</b><small>{f.short}</small></span>
                <FontAwesomeIcon icon={faArrowLeft} className="bz-feature-mini-go h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
