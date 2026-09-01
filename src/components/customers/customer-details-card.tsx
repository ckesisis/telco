"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatHomeAddress } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS } from "@/config/document-types";
import type { DocumentType } from "@/generated/prisma/client";
import {
  CustomerFormFields,
  customerToFormValues,
  formValuesToPayload,
  type CustomerFormValues,
} from "@/components/customers/customer-form-fields";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  fatherName: string | null;
  vatNumber: string | null;
  contactPhone: string;
  documentType: DocumentType;
  documentNumber: string | null;
  documentIssuer: string | null;
  homeStreet: string | null;
  homeNumber: string | null;
  homeCity: string | null;
  homePostalCode: string | null;
  homeRegion: string | null;
  notes: string | null;
  sourceId: string | null;
  createdAt: Date | string;
  source: { id: string; name: string } | null;
};

type Source = { id: string; name: string };

export function CustomerDetailsCard({
  customer,
  sources,
}: {
  customer: Customer;
  sources: Source[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CustomerFormValues>(() => customerToFormValues(customer));

  function startEditing() {
    setForm(customerToFormValues(customer));
    setError("");
    setEditing(true);
  }

  function cancelEditing() {
    setForm(customerToFormValues(customer));
    setError("");
    setEditing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/v1/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: customer.id,
        ...formValuesToPayload(form),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Σφάλμα");
      setLoading(false);
      return;
    }

    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Στοιχεία</CardTitle>
        {!editing && (
          <Button type="button" variant="outline" size="sm" onClick={startEditing}>
            <Pencil className="h-4 w-4" />
            Επεξεργασία
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <CustomerFormFields form={form} onChange={setForm} sources={sources} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelEditing} disabled={loading}>
                Ακύρωση
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Αποθήκευση..." : "Αποθήκευση"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Όνομα:</span> {customer.firstName} {customer.lastName}
            </p>
            <p><span className="text-slate-500">Τηλέφωνο:</span> {customer.contactPhone}</p>
            <p><span className="text-slate-500">ΑΦΜ:</span> {customer.vatNumber ?? "—"}</p>
            <p>
              <span className="text-slate-500">Έγγραφο:</span>{" "}
              {DOCUMENT_TYPE_LABELS[customer.documentType]}
              {customer.documentNumber ? ` · ${customer.documentNumber}` : ""}
            </p>
            <p><span className="text-slate-500">Εκδούσα Αρχή:</span> {customer.documentIssuer ?? "—"}</p>
            <p><span className="text-slate-500">Πατρώνυμο:</span> {customer.fatherName ?? "—"}</p>
            <p>
              <span className="text-slate-500">Διεύθυνση Κατοικίας:</span>{" "}
              {formatHomeAddress(customer)}
            </p>
            <p><span className="text-slate-500">Πηγή:</span> {customer.source?.name ?? "—"}</p>
            <p><span className="text-slate-500">Σημειώσεις:</span> {customer.notes ?? "—"}</p>
            <p><span className="text-slate-500">Δημιουργήθηκε:</span> {formatDate(customer.createdAt)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
