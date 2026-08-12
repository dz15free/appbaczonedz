"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCode, faImage, faLink, faQuoteRight, faBullhorn } from "@fortawesome/free-solid-svg-icons";
import { useSiteSettings, type BlogSidebarBlock } from "@/features/settings/use-site-settings";

function safeHref(value?: string) {
  const href = (value ?? "").trim();
  return href.startsWith("/") || /^https?:\/\//i.test(href) || href.startsWith("mailto:") ? href : "#";
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

function blockIcon(type: BlogSidebarBlock["type"]) {
  if (type === "image") return faImage;
  if (type === "link") return faLink;
  if (type === "cta") return faBullhorn;
  if (type === "native") return faCode;
  return faQuoteRight;
}

function sanitizeHtml(input: string) {
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|iframe|object|embed|form|style|link|meta|base|svg|math)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|form|style|link|meta|base|svg|math)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(style|srcdoc)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*(?:javascript:|data:)[^"']*\2/gi, "")
    .replace(/\s(href|src)\s*=\s*(?:javascript:|data:)[^\s>]+/gi, "");
}

function scopeCss(input: string) {
  return input
    .replace(/@import[^;]+;/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "none")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/(^|})\s*([^@{}][^{]*)\{/g, (_, prefix: string, selectors: string) => {
      const scoped = selectors
        .split(",")
        .map((selector) => `.bz-native-widget ${selector.trim()}`)
        .join(", ");
      return `${prefix}\n${scoped}{`;
    });
}

function NativeWidget({ block }: { block: BlogSidebarBlock }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const html = block.html || block.content || "";
  const css = block.css || "";

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = "";
    const body = document.createElement("div");
    body.className = "bz-native-widget-body";
    body.innerHTML = sanitizeHtml(html);
    body.querySelectorAll("a").forEach((anchor) => {
      const href = anchor.getAttribute("href") || "#";
      if (!(href.startsWith("/") || /^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("#"))) {
        anchor.removeAttribute("href");
      }
      if (/^https?:\/\//i.test(href)) {
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
      }
    });
    root.appendChild(body);
    if (css.trim()) {
      const style = document.createElement("style");
      style.textContent = scopeCss(css);
      root.appendChild(style);
    }
    return () => { root.innerHTML = ""; };
  }, [css, html]);

  if (!html.trim() && !css.trim() && !block.javascript?.trim()) return null;
  return (
    <div className="bz-blog-widget bz-native-widget-shell">
      {block.title && <h3 className="bz-blog-widget-title"><FontAwesomeIcon icon={faCode} className="h-3.5 w-3.5" />{block.title}</h3>}
      <div ref={rootRef} className="bz-native-widget-content" />
      {block.javascript?.trim() && (
        <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          تم حفظ JavaScript في لوحة الإدارة، لكن تشغيل الكود الخام معطّل لحماية الحساب والصفحة. استخدم HTML/CSS الآمن أو تكاملاً معتمداً.
        </p>
      )}
    </div>
  );
}

function SidebarBlock({ block }: { block: BlogSidebarBlock }) {
  const href = safeHref(block.href);
  const external = isExternal(href);
  if (block.type === "native") return <NativeWidget block={block} />;

  if (block.type === "image" && block.imageUrl) {
    const image = <img src={block.imageUrl} alt={block.title || ""} width={640} height={360} loading="lazy" decoding="async" className="w-full rounded-xl object-cover" />;
    return <div className="bz-blog-widget">{block.title && <h3 className="bz-blog-widget-title"><FontAwesomeIcon icon={blockIcon(block.type)} className="h-3.5 w-3.5" />{block.title}</h3>}{href !== "#" ? <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{image}</a> : image}</div>;
  }

  if (block.type === "link" && href !== "#") {
    const content = <span className="bz-blog-widget-link"><span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold">{block.title || block.content}</span>{block.title && block.content && <span className="mt-1 block text-[11.5px] leading-relaxed text-text-muted">{block.content}</span>}</span><FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3 shrink-0" /></span>;
    return <div className="bz-blog-widget">{external ? <a href={href} target="_blank" rel="noopener noreferrer">{content}</a> : <Link href={href}>{content}</Link>}</div>;
  }

  if (block.type === "cta" && href !== "#") {
    const content = <span className="bz-blog-widget-cta"><span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold">{block.title || "ابدأ من هنا"}</span>{block.content && <span className="mt-1 block text-[11.5px] leading-relaxed text-white/75">{block.content}</span>}</span><FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5 shrink-0" /></span>;
    return <div className="bz-blog-widget">{external ? <a href={href} target="_blank" rel="noopener noreferrer">{content}</a> : <Link href={href}>{content}</Link>}</div>;
  }

  if (block.type === "text" && (block.title || block.content)) {
    return <div className="bz-blog-widget">{block.title && <h3 className="bz-blog-widget-title"><FontAwesomeIcon icon={faQuoteRight} className="h-3.5 w-3.5" />{block.title}</h3>}{block.content && <p className="text-[12.5px] leading-[1.9] text-text-muted">{block.content}</p>}</div>;
  }
  return null;
}

export function BlogSidebar({ placement = "both" }: { placement?: "blog-index" | "article" | "both" }) {
  const { settings } = useSiteSettings();
  const blocks = useMemo(() => (settings.blogSidebar?.blocks ?? [])
    .filter((block) => block.active !== false && (block.placement === "both" || block.placement === placement))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [placement, settings.blogSidebar?.blocks]);
  if (!settings.blogSidebar?.enabled || blocks.length === 0) return null;
  return <aside className="bz-blog-sidebar" aria-label="أدوات ومصادر المدونة"><div className="space-y-3">{blocks.map((block) => <SidebarBlock key={block.id} block={block} />)}</div></aside>;
}

export function BlogLayout({ children, placement = "both" }: { children: React.ReactNode; placement?: "blog-index" | "article" | "both" }) {
  const { settings } = useSiteSettings();
  const hasBlocks = Boolean(settings.blogSidebar?.enabled && (settings.blogSidebar.blocks ?? []).some((block) => block.active !== false && (block.placement === "both" || block.placement === placement)));
  return <div className={`mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:py-10 ${hasBlocks ? "lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start" : "lg:grid-cols-1"}`}><section className="min-w-0">{children}</section>{hasBlocks && <BlogSidebar placement={placement} />}</div>;
}
