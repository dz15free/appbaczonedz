import type { ReactNode } from "react";
import type { SidebarPlacement, SidebarWidget } from "@/features/settings/use-site-settings";
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

export async function PublicSidebarLayout({
  placement,
  children,
}: {
  placement: SidebarPlacement;
  children: ReactNode;
}) {
  const widgets = await getPublicSidebarWidgets(placement);
  if (widgets.length === 0) return <>{children}</>;

  return (
    <div className="bz-public-content-layout">
      <div className="bz-public-content-main">{children}</div>
      <aside className="bz-public-sidebar" aria-label="محتوى جانبي">
        {widgets.map((widget) => <Widget key={widget.id} widget={widget} />)}
      </aside>
    </div>
  );
}
