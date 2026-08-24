"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";

/**
 * The landing page is public and must render on the server. Authentication is
 * still honoured: once Firebase confirms a session, redirect the user to the
 * private home without placing a client gate around the server-rendered HTML.
 */
export function PublicRootRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [loading, router, user]);

  return null;
}
