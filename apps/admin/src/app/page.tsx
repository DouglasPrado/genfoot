"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/lib/session";

export default function Home() {
  const { session, hydrated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (hydrated) router.replace(session ? "/worlds" : "/login");
  }, [hydrated, session, router]);

  return null;
}
