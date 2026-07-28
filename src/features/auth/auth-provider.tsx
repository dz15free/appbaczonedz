"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { auth, rtdb } from "@/lib/firebase/config";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  banned: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, banned: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // التسجيل مباشر دون تأكيد البريد
      setUser(u ?? null);
      setLoading(false);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  // فرض إيقاف الحساب: إن كان platformBan=true نُخرجه فوراً
  useEffect(() => {
    if (!user) {
      setBanned(false);
      return;
    }
    const unsub = onValue(ref(rtdb, `users/${user.uid}/platformBan`), (snap) => {
      if (snap.val() === true) {
        setBanned(true);
        signOut(auth).catch(() => {});
      }
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user]);

  if (banned) {
    return (
      <div className="grid min-h-[100dvh] place-items-center p-8 text-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-danger">تم إيقاف حسابك</h1>
          <p className="mt-2 text-text-muted">للمراجعة، تواصل مع إدارة المنصة.</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, loading, banned }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
