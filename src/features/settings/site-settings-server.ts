import { DEFAULTS } from "@/features/settings/site-settings-defaults";
import type { SidebarWidget, SiteSettings } from "@/features/settings/use-site-settings";
import { DEFAULT_FAVICON, DEFAULT_LOGO } from "@/lib/brand-assets";

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
export const PUBLIC_SETTINGS_TTL = 600;
const LEGACY_LOGO_HOST = "blogger.googleusercontent.com";

type RawSettings = Partial<SiteSettings> & {
  footerLinksCleared?: boolean;
};

function normalize(raw: RawSettings | null): SiteSettings {
  const merged = { ...DEFAULTS, ...(raw ?? {}) } as SiteSettings & { footerLinksCleared?: boolean };
  const stale = (value?: string) => !value || value.includes(LEGACY_LOGO_HOST);
  const sidebar = raw?.sidebar;
  const rawWidgets = sidebar?.widgets;
  const widgets = Array.isArray(rawWidgets)
    ? rawWidgets
    : rawWidgets && typeof rawWidgets === "object"
      ? Object.values(rawWidgets)
      : [];

  merged.logoUrl = stale(merged.logoUrl) ? DEFAULT_LOGO : merged.logoUrl;
  merged.faviconUrl = stale(merged.faviconUrl) ? DEFAULT_FAVICON : merged.faviconUrl;
  merged.sidebar = {
    enabled: sidebar?.enabled === true,
    widgets: widgets.filter((widget): widget is SidebarWidget => Boolean(widget && typeof widget === "object")),
  };
  if (raw?.footerLinksCleared) merged.footerLinks = [];
  return merged;
}

export async function getPublicSiteSettings(): Promise<SiteSettings> {
  if (!DB) return normalize(null);
  try {
    const response = await fetch(`${DB}/settings.json`, { next: { revalidate: PUBLIC_SETTINGS_TTL } });
    if (!response.ok) return normalize(null);
    return normalize((await response.json()) as RawSettings | null);
  } catch {
    return normalize(null);
  }
}
