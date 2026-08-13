
import Link from "next/link";
import type { SidebarArticlesSettings, SidebarPlacement, SidebarWidget } from "@/features/settings/use-site-settings";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { SidebarScript } from "@/features/sidebar/sidebar-script";

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
const TTL = 600;

type RawSidebar = {
  enabled?: boolean;
  widgets?: SidebarWidget[] | Record<string, SidebarWidget>;
};

async function readSidebar(): Promise<RawSidebar | null> {
  if (!DB) return null;
  try {
    const response = await fetch(`${DB}/settings/sidebar.json`, { next: { revalidate: TTL } });
    if (!response.ok) return null;
    return (await response.json()) as RawSidebar | null;
  } catch {
    return null;
  }
}

async function readSidebarArticles(): Promise<SidebarArticlesSettings | null> {
  if (!DB) return null;
  try {
    const response = await fetch(`${DB}/settings/sidebarArticles.json`, { next: { revalidate: TTL } });
    if (!response.ok) return null;
    return (await response.json()) as SidebarArticlesSettings | null;
  } catch {
    return null;
  }
}

function normalizeWidgets(raw?: RawSidebar["widgets"]): SidebarWidget[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
  return list
    .filter((widget): widget is SidebarWidget => Boolean(widget && typeof widget === "object" && widget.id && widget.html))
    .map((widget, index) => ({
      ...widget,
      enabled: widget.enabled !== false,
      order: typeof widget.order === "number" ? widget.order : index,
      placement: widget.placement ?? "global",
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getPublicSidebarWidgets(placement: SidebarPlacement): Promise<SidebarWidget[]> {
  const settings = await readSidebar();
  if (!settings?.enabled) return [];
  return normalizeWidgets(settings.widgets).filter(
    (widget) => widget.enabled !== false && (widget.placement === "global" || widget.placement === placement),
  );
}

function Widget({ widget }: { widget: SidebarWidget }) {
  return (
    <section className="bz-sidebar-widget" data-placement={widget.placement ?? "global"}>
      {widget.title?.trim() && <h2 className="bz-sidebar-widget-title">{widget.title}</h2>}
      {widget.css?.trim() && <style dangerouslySetInnerHTML={{ __html: widget.css }} />}
      <div className="bz-sidebar-widget-html" dangerouslySetInnerHTML={{ __html: widget.html }} />
      {widget.js?.trim() && <SidebarScript code={widget.js} />}
    </section>
  );
}

function normalizeArticles(raw: SidebarArticlesSettings | null): Required<SidebarArticlesSettings> {
  const limit = Number(raw?.limit ?? 4);
  return {
    enabled: raw?.enabled !== false,
    mode: raw?.mode === "label" ? "label" : "latest",
    label: typeof raw?.label === "string" ? raw.label.trim() : "",
    limit: Number.isFinite(limit) ? Math.min(8, Math.max(2, Math.round(limit))) : 4,
  };
}

async function SidebarArticles() {
  const settings = normalizeArticles(await readSidebarArticles());
  if (!settings.enabled) return null;

  const published = await getPublishedEntries();
  const candidates = settings.mode === "label" && settings.label
    ? published.filter((entry) => (entry.labels ?? []).some((label) => label.toLocaleLowerCase("ar") === settings.label.toLocaleLowerCase("ar")))
    : published;
  const entries = candidates.slice(0, settings.limit);
  if (entries.length === 0) return null;

  return (
    <section className="bz-sidebar-articles" aria-label="مقالات منشورة">
      <div className="bz-sidebar-articles-head"><div><span className="bz-sidebar-articles-kicker">اقرأ أيضاً</span><h2>مقالات تفيدك الآن</h2></div><Link href="/blog" aria-label="كل المقالات">الكل <span>←</span></Link></div>
      <div className="bz-sidebar-articles-list">
        {entries.map((entry) => (
          <Link key={entry.id} href={`/blog/${entry.slug}`} className="bz-sidebar-article-card">
            {entry.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.cover} alt="" loading="lazy" />
            ) : <span className="bz-sidebar-article-fallback">ب</span>}
            <span className="bz-sidebar-article-copy"><span className="bz-sidebar-article-label">{entry.labels?.[0] || "مراجعة"}</span><b>{entry.title}</b><small>{entry.readMinutes} دقائق قراءة</small></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function PublicSidebarLayout({
  placement,
  children,
  includeArticles = true,
}: {
  placement: SidebarPlacement;
  children: React.ReactNode;
  /** Landing keeps its own content architecture and never renders article cards. */
  includeArticles?: boolean;
}) {
  const [widgets, articles] = await Promise.all([
    getPublicSidebarWidgets(placement),
    includeArticles ? SidebarArticles() : Promise.resolve(null),
  ]);
  if (widgets.length === 0 && !articles) return <>{children}</>;

  return (
    <div className="bz-public-content-layout">
      <div className="bz-public-content-main">{children}</div>
      <aside className="bz-public-sidebar" aria-label="محتوى جانبي">
        {widgets.map((widget) => <Widget key={widget.id} widget={widget} />)}
        {articles}
      </aside>
    </div>
  );
}
