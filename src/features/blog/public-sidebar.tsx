"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBullhorn, faImage, faLink as faLinkIcon, faQuoteRight, faCode } from "@fortawesome/free-solid-svg-icons";
import { useSiteSettings, type BlogSidebarBlock } from "@/features/settings/use-site-settings";

function safeHref(value?: string) {
  const href = (value ?? "").trim();
  if (href.startsWith("/") || /^https?:\/\//i.test(href)) return href;
  return "#";
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

function BlockIcon({ type }: { type: BlogSidebarBlock["type"] }) {
  const icon = type === "image" ? faImage : type === "link" ? faLinkIcon : type === "cta" ? faBullhorn : type === "embed" ? faCode : faQuoteRight;
  return <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" aria-hidden />;
}

function EmbedWidget({ block }: { block: BlogSidebarBlock }) {
  const html = block.html || block.content || "";
  const css = block.css || "";
  const javascript = block.javascript || "";
  if (!html && !css && !javascript) return null;
  const srcDoc = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent;font-family:Arial,sans-serif;color:#172033}*{box-sizing:border-box}a{color:inherit}${css}</style></head><body>${html}${javascript ? `<script>${javascript.replace(/<\/script/gi, "<\\/script")}</script>` : ""}</body></html>`;
  const sandbox = block.sandbox === "allow-scripts" ? "allow-scripts allow-forms allow-popups" : "";
  return (
    <div className="bz-blog-widget bz-blog-embed-widget">
      {block.title && <h3 className="bz-blog-widget-title"><BlockIcon type="embed" />{block.title}</h3>}
      <iframe title={block.title || "Widget مضمّن"} srcDoc={srcDoc} sandbox={sandbox} loading="lazy" className="min-h-[120px] w-full rounded-xl border-0 bg-transparent" />
    </div>
  );
}

function SidebarBlock({ block }: { block: BlogSidebarBlock }) {
  const href = safeHref(block.href);
  const external = isExternal(href);

  if (block.type === "embed") return <EmbedWidget block={block} />;

  if (block.type === "image" && block.imageUrl) {
    const image = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={block.imageUrl} alt={block.title || ""} width={640} height={360} loading="lazy" decoding="async" className="w-full rounded-xl object-cover" />
    );
    return (
      <div className="bz-blog-widget">
        {block.title && <h3 className="bz-blog-widget-title"><BlockIcon type={block.type} />{block.title}</h3>}
        {href !== "#" ? <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{image}</a> : image}
      </div>
    );
  }

  if (block.type === "link" && href !== "#") {
    const content = (
      <span className="bz-blog-widget-link">
        <span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold">{block.title || block.content}</span>{block.title && block.content && <span className="mt-1 block text-[11.5px] leading-relaxed text-text-muted">{block.content}</span>}</span>
        <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3 shrink-0" />
      </span>
    );
    return <div className="bz-blog-widget">{external ? <a href={href} target="_blank" rel="noopener noreferrer">{content}</a> : <Link href={href}>{content}</Link>}</div>;
  }

  if (block.type === "cta" && href !== "#") {
    const content = (
      <span className="bz-blog-widget-cta"><span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold">{block.title || "ابدأ من هنا"}</span>{block.content && <span className="mt-1 block text-[11.5px] leading-relaxed text-white/75">{block.content}</span>}</span><FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5 shrink-0" /></span>
    );
    return <div className="bz-blog-widget">{external ? <a href={href} target="_blank" rel="noopener noreferrer">{content}</a> : <Link href={href}>{content}</Link>}</div>;
  }

  if (block.type === "text" && (block.title || block.content)) {
    return (
      <div className="bz-blog-widget">
        {block.title && <h3 className="bz-blog-widget-title"><BlockIcon type={block.type} />{block.title}</h3>}
        {block.content && <p className="text-[12.5px] leading-[1.9] text-text-muted">{block.content}</p>}
      </div>
    );
  }

  return null;
}

export function BlogSidebar() {
  const { settings } = useSiteSettings();
  const blocks = (settings.blogSidebar?.blocks ?? [])
    .filter((block) => block.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (!settings.blogSidebar?.enabled || blocks.length === 0) return null;

  return (
    <aside className="bz-blog-sidebar" aria-label="محتوى إضافي في المدونة">
      <p className="bz-blog-sidebar-label">أدوات ومصادر BacZone</p>
      <div className="space-y-3">
        {blocks.map((block) => <SidebarBlock key={block.id} block={block} />)}
      </div>
    </aside>
  );
}

export function BlogLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useSiteSettings();
  const blocks = (settings.blogSidebar?.blocks ?? []).filter((block) => block.active !== false);
  const visible = Boolean(settings.blogSidebar?.enabled && blocks.length > 0);

  return (
    <div className={`mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:py-10 ${visible ? "lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start" : "lg:grid-cols-1"}`}>
      <section className="min-w-0">{children}</section>
      {visible && <BlogSidebar />}
    </div>
  );
}
