"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DIALOG_BODY_CLASS, DIALOG_FOOTER_CLASS } from "@/components/ui/dialog-layout";
import { cn } from "@/lib/utils";
import type { CustomerOption } from "@/components/customers/customer-search-select";
import {
  CustomerFormFields,
  formValuesToPayload,
  type CustomerFormValues,
} from "@/components/customers/customer-form-fields";
import type { DocumentType } from "@/generated/prisma/client";

export type CustomerSummary = CustomerOption;

type CustomerCreateFormProps = {
  onSuccess: (customer: CustomerSummary) => void;
  onCancel?: () => void;
  submitLabel?: string;
  defaultPhone?: string;
  /** "dialog" scrolls the fields and keeps the actions pinned at the bottom. */
  layout?: "page" | "dialog";
};

export function CustomerCreateForm({
  onSuccess,
  onCancel,
  submitLabel = "Αποθήκευση",
  defaultPhone = "",
  layout = "page",
}: CustomerCreateFormProps) {
  const inDialog = layout === "dialog";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CustomerFormValues>({
    firstName: "",
    lastName: "",
    fatherName: "",
    vatNumber: "",
    taxOffice: "",
    contactPhone: defaultPhone,
    documentType: "id_card" as DocumentType,
    documentNumber: "",
    documentIssuer: "",
    homeStreet: "",
    homeNumber: "",
    homeCity: "",
    homePostalCode: "",
    homeRegion: "",
    notes: "",
    sourceId: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/v1/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValuesToPayload(form)),
    });

    const data = await res.json();
    if (!res.ok && !data.customer) {
      setError(typeof data.error === "string" ? data.error : "Σφάλμα");
      setLoading(false);
      return;
    }

    const customer = data.customer ?? data;
    onSuccess({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      contactPhone: customer.contactPhone,
      vatNumber: customer.vatNumber,
      documentNumber: customer.documentNumber,
      documentType: customer.documentType,
      homeStreet: customer.homeStreet,
      homeNumber: customer.homeNumber,
      homeCity: customer.homeCity,
      homePostalCode: customer.homePostalCode,
      homeRegion: customer.homeRegion,
    });
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={inDialog ? "flex min-h-0 flex-1 flex-col" : "space-y-4"}
    >
      <div className={cn(inDialog && DIALOG_BODY_CLASS, "space-y-4")}>
        <CustomerFormFields form={form} onChange={setForm} />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
      <div className={inDialog ? DIALOG_FOOTER_CLASS : "flex justify-end gap-2"}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Ακύρωση
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Αποθήκευση..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
