"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { BADGES, earnedBadges, levelInfo, type UserStats } from "./points";

const COLOR: Record<string, string> = {
  primary: "text-primary bg-primary/10",
  secondary: "text-secondary bg-secondary/10",
  warning: "text-warning bg-warning/10",
  danger: "text-danger bg-danger/10",
};

export function ProfileBadges({ stats, friendCount }: { stats: UserStats; friendCount: number }) {
  const earned = new Set(earnedBadges(stats, friendCount).map((b) => b.id));
  const { level, into, span, pct } = levelInfo(stats.points ?? 0);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {/* تقدّم المستوى */}
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-bold">المستوى {level}</span>
        <span className="text-text-muted">{into}/{span} للمستوى التالي</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* الأوسمة */}
      <h3 className="mb-2 mt-4 text-sm font-bold">الأوسمة ({earned.size}/{BADGES.length})</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {BADGES.map((b) => {
          const got = earned.has(b.id);
          return (
            <div
              key={b.id}
              title={b.desc}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center ${
                got ? "border-border" : "border-dashed border-border opacity-50"
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-full ${got ? COLOR[b.color] : "bg-background text-text-muted"}`}>
                <FontAwesomeIcon icon={got ? b.icon : faLock} className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-semibold leading-tight">{b.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
