"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DataTable } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_LINE_LABELS, PRODUCT_LINES } from "@/config/product-lines";
import { readWholeAmount, wholeAmountDraft } from "@/lib/utils";

type Offer = {
  id: string;
  code: string;
  name: string;
  productLine: string;
  catalogMonthlyAmount: string | null;
  enabled: boolean;
};

export function OffersSettings({ offers: initial }: { offers: Offer[] }) {
  const router = useRouter();
  const [offers, setOffers] = useState(initial);
  const [form, setForm] = useState({
    code: "", name: "", productLine: "prepaid_mobile", catalogMonthlyAmount: "", prepaidGroup: "",
  });
  const [amountError, setAmountError] = useState("");
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "offer",
        ...form,
        catalogMonthlyAmount: readWholeAmount(form.catalogMonthlyAmount),
      }),
    });
    if (res.ok) {
      const offer = await res.json();
      setOffers([...offers, offer]);
      setForm({ code: "", name: "", productLine: "prepaid_mobile", catalogMonthlyAmount: "", prepaidGroup: "" });
      setAmountError("");
      setError("");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error ?? "Σφάλμα");
  }

  return (
    <div>
      <PageHeader title="Προσφορές" description="Κατάλογος προσφορών" />
      <Card className="mb-6 max-w-xl">
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Κωδικός</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
              <div className="space-y-1"><Label>Όνομα</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            </div>
            <div className="space-y-1">
              <Label>Γραμμή</Label>
              <Select value={form.productLine} onValueChange={(v) => setForm({ ...form, productLine: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_LINES.map((l) => <SelectItem key={l} value={l}>{PRODUCT_LINE_LABELS[l]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Τιμή καταλόγου (€)</Label>
              <Input
                inputMode="numeric"
                value={form.catalogMonthlyAmount}
                onChange={(e) => {
                  const next = wholeAmountDraft(e.target.value);
                  setAmountError(next.error);
                  setForm({ ...form, catalogMonthlyAmount: next.value });
                }}
                placeholder="Ακέραιο ποσό"
              />
              {amountError && <p className="text-sm text-red-600">{amountError}</p>}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit">Προσθήκη</Button>
          </form>
        </CardContent>
      </Card>
      <DataTable
        headers={["Κωδικός", "Όνομα", "Γραμμή", "Τιμή", "Ενεργή"]}
        rows={offers.map((o) => [
          o.code, o.name,
          PRODUCT_LINE_LABELS[o.productLine as keyof typeof PRODUCT_LINE_LABELS],
          o.catalogMonthlyAmount != null && Number.isInteger(Number(o.catalogMonthlyAmount))
            ? String(Number(o.catalogMonthlyAmount))
            : (o.catalogMonthlyAmount ?? "—"),
          o.enabled ? "Ναι" : "Όχι",
        ])}
      />
    </div>
  );
}
