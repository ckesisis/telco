"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockCallIngestView } from "./actions";

export function UnlockForm({ error }: { error?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        await unlockCallIngestView(formData);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoFocus />
      </div>
      {error === "invalid" && (
        <p className="text-sm text-red-600">Wrong password.</p>
      )}
      {error === "unconfigured" && (
        <p className="text-sm text-red-600">
          This view is not configured. Set CALL_INGEST_VIEW_PASSWORD.
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Checking..." : "View payloads"}
      </Button>
    </form>
  );
}
