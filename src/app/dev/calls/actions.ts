"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CALL_INGEST_SHARE_COOKIE,
  callIngestShareCookieValue,
  callIngestSharePasswordMatches,
  isCallIngestShareConfigured,
} from "@/lib/call-ingest-share";

export async function unlockCallIngestView(formData: FormData) {
  if (!isCallIngestShareConfigured()) {
    redirect("/dev/calls?error=unconfigured");
  }

  const password = String(formData.get("password") ?? "");
  if (!callIngestSharePasswordMatches(password)) {
    redirect("/dev/calls?error=invalid");
  }

  const token = callIngestShareCookieValue();
  if (!token) redirect("/dev/calls?error=unconfigured");

  const cookieStore = await cookies();
  cookieStore.set(CALL_INGEST_SHARE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/dev/calls",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/dev/calls");
}
