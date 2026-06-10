"use client";

import { useEffect, useState } from "react";
import { ref, query, orderByChild, limitToLast, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export function useLeaderboardRank(uid: string | undefined, points: number | undefined) {
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (!uid || !points) return;
    let cancelled = false;
    const q = query(ref(rtdb, "users"), orderByChild("points"), limitToLast(500));
    get(q).then((snap) => {
      if (cancelled) return;
      const val = snap.val() ?? {};
      const sorted = Object.entries(val)
        .map(([id, u]: any) => ({ id, pts: u.points ?? 0 }))
        .sort((a, b) => b.pts - a.pts);
      const idx = sorted.findIndex((u) => u.id === uid);
      setRank(idx >= 0 ? idx + 1 : null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [uid, points]);

  return rank;
}
