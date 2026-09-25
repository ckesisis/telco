import { createHmac, timingSafeEqual } from "crypto";

export const CALL_INGEST_SHARE_COOKIE = "call_ingest_share";
export const CALL_INGEST_OWNER_EMAIL = "owner@demo.telco";

function sharePassword() {
  const password = process.env.CALL_INGEST_VIEW_PASSWORD;
  return password?.trim() ? password : null;
}

export function isCallIngestShareConfigured() {
  return sharePassword() !== null;
}

function shareToken() {
  const password = sharePassword();
  if (!password) return null;
  return createHmac("sha256", password).update("call-ingest-share").digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function callIngestShareCookieValue() {
  return shareToken();
}

export function isCallIngestShareUnlocked(cookieValue: string | undefined) {
  const expected = shareToken();
  if (!expected || !cookieValue) return false;
  return safeEqual(cookieValue, expected);
}

export function callIngestSharePasswordMatches(input: string) {
  const password = sharePassword();
  if (!password) return false;
  return safeEqual(input, password);
}
