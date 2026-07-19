"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";

/* ════════════════════════════════════════════════════════════
   الروابط داخل النصوص

   <Linkify>  يحوّل أي رابط في النص إلى رابط قابل للضغط.
   <LinkPreview> يعرض بطاقة معاينة (عنوان، وصف، صورة) لأول رابط.

   المعاينة تُجلب مرّة واحدة لكل رابط في عمر الصفحة (ذاكرة محلية)،
   ومخزّنة أسبوعاً على حافة Vercel — فالرابط الشائع لا يُجلب إلا مرّة.
════════════════════════════════════════════════════════════ */

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/gi;

export interface PreviewData {
  url: string;
  siteName?: string;
  title?: string;
  description?: string;
  image?: string;
}

/** ذاكرة داخل الصفحة — تمنع تكرار الطلب لنفس الرابط */
const memory = new Map<string, PreviewData | null>();
const inflight = new Map<string, Promise<PreviewData | null>>();

export function extractFirstUrl(text: string): string | null {
  const m = text.match(URL_RE);
  return m?.[0] ?? null;
}

async function fetchPreview(url: string): Promise<PreviewData | null> {
  if (memory.has(url)) return memory.get(url) ?? null;
  const existing = inflight.get(url);
  if (existing) return existing;

  const p = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d: PreviewData | null) => {
      memory.set(url, d);
      return d;
    })
    .catch(() => {
      memory.set(url, null);
      return null;
    })
    .finally(() => inflight.delete(url));

  inflight.set(url, p);
  return p;
}

/* ─────────── نص بروابط قابلة للضغط ─────────── */
export function Linkify({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;

  text.replace(URL_RE, (match, _g, offset: number) => {
    if (offset > last) parts.push(text.slice(last, offset));
    parts.push(
      <a
        key={`l${i++}`}
        href={match}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={(e) => e.stopPropagation()}
        className="break-all font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
        dir="ltr"
      >
        {match.length > 60 ? `${match.slice(0, 57)}...` : match}
      </a>
    );
    last = offset + match.length;
    return match;
  });

  if (last < text.length) parts.push(text.slice(last));
  return <span className={className}>{parts.length ? parts : text}</span>;
}

/* ─────────── بطاقة المعاينة ─────────── */
export function LinkPreview({ url, compact }: { url: string; compact?: boolean }) {
  const [data, setData] = useState<PreviewData | null | undefined>(
    memory.has(url) ? memory.get(url) : undefined
  );

  useEffect(() => {
    if (data !== undefined) return;
    let alive = true;
    fetchPreview(url).then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, [url, data]);

  // أثناء الجلب لا نعرض هيكلاً وامضاً — الرابط نفسه ظاهر في النص أصلاً
  if (data === undefined || data === null) return null;

  const host = (() => {
    try { return new URL(data.url).hostname.replace(/^www\./, ""); }
    catch { return data.siteName ?? ""; }
  })();

  // بلا عنوان ولا صورة لا تضيف البطاقة شيئاً على الرابط نفسه
  if (!data.title && !data.image) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={(e) => e.stopPropagation()}
      className="mt-1.5 block overflow-hidden rounded-xl border border-border bg-surface transition hover:border-primary/40"
    >
      {data.image && !compact && (
        // صورة خارجية: <img> عادية عمداً — next/image يتطلّب تسجيل كل نطاق مسبقاً
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-32 w-full bg-border object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="p-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted">
          <FontAwesomeIcon icon={faLink} className="h-2.5 w-2.5" />
          <span dir="ltr" className="truncate">{host}</span>
        </p>
        {data.title && (
          <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-snug text-text-primary" dir="auto">
            {data.title}
          </p>
        )}
        {data.description && !compact && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-text-muted" dir="auto">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}

/* ─────────── نص + معاينة أول رابط فيه ─────────── */
/**
 * نص بروابط قابلة للضغط + معاينة أول رابط.
 *
 * noPreview: يُمرَّر حين يحوي المنشور صوراً أو فيديو — عندها الوسائط
 * هي المحتوى، وبطاقة المعاينة تصبح تكراراً بصرياً مزعجاً (سلوك فيسبوك).
 */
export function RichText({ text, className, compact, noPreview }: {
  text: string; className?: string; compact?: boolean; noPreview?: boolean;
}) {
  const url = extractFirstUrl(text);
  return (
    <>
      <Linkify text={text} className={className} />
      {url && !noPreview && <LinkPreview url={url} compact={compact} />}
    </>
  );
}
