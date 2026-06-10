"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export interface Profile {
  name?: string;
  email?: string;
  track?: string | null;
  wilaya?: string | null;
  role?: string;
  points?: number;
  level?: number;
  streak?: number;
  postCount?: number;
  commentCount?: number;
  avatarUrl?: string | null;
}

export function useProfile(uid?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = onValue(ref(rtdb, `users/${uid}`), (snap) => {
      setProfile((snap.val() as Profile) ?? null);
    });
    return () => unsub();
  }, [uid]);

  return profile;
}
