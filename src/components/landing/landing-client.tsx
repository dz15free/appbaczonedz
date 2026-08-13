"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

export function FaviconSync({ href }: { href?: string }) {
  useEffect(() => {
    if (!href) return;
    const put = (rel: string, key: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[data-bz="${key}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        link.dataset.bz = key;
        document.head.appendChild(link);
      }
      if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    };
    put("icon", "icon");
    put("apple-touch-icon", "apple");
  }, [href]);
  return null;
}

export function LandingFaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`overflow-hidden rounded-2xl border transition-all duration-300 ${open ? "border-primary/25 bg-[var(--bz-bg)] shadow-sm" : "border-border/60 bg-[var(--bz-bg)]"}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-4 py-4 text-right transition hover:bg-primary/[0.03] sm:px-5 sm:py-[1.15rem]"
      >
        <span className="flex-1 text-[14px] font-bold leading-snug sm:text-[15px]">{q}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
        </span>
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="px-4 pb-5 text-[13.5px] leading-loose text-text-muted sm:px-5 sm:text-[14px]">{a}</p>
        </div>
      </div>
    </div>
  );
}
