"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/lib/session";

export default function Home() {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    router.replace(session ? "/worlds" : "/login");
  }, [session, router]);

  return null;
}
