"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";

interface PublicBackButtonProps {
  fallbackHref: string;
  fallbackLabel?: string;
  tone?: "surface" | "dark";
  className?: string;
}

/**
 * رجوع سياقي للصفحات العامة: يستعمل history الخاص بـ Next عندما يكون الدخول
 * من داخل الموقع، ويعود إلى القسم الأب عند فتح الرابط مباشرة أو من خارج الموقع.
 */
export function PublicBackButton({
  fallbackHref,
  fallbackLabel,
  tone = "surface",
  className = "",
}: PublicBackButtonProps) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const hasInternalHistory = window.history.length > 1 && referrer.startsWith(window.location.origin);
      if (hasInternalHistory) {
        router.back();
        return;
      }
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`bz-public-back ${tone === "dark" ? "is-dark" : ""} ${className}`.trim()}
      aria-label={fallbackLabel ? `رجوع أو العودة إلى ${fallbackLabel}` : "رجوع"}
      title={fallbackLabel ? `رجوع أو العودة إلى ${fallbackLabel}` : "رجوع"}
    >
      <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" aria-hidden="true" />
      <span>رجوع</span>
    </button>
  );
}
