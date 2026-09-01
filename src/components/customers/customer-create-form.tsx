"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
};

export function CustomerCreateForm({
  onSuccess,
  onCancel,
  submitLabel = "Αποθήκευση",
  defaultPhone = "",
}: CustomerCreateFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CustomerFormValues>({
    firstName: "",
    lastName: "",
    fatherName: "",
    vatNumber: "",
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

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Σφάλμα");
      setLoading(false);
      return;
    }

    const customer = await res.json();
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <CustomerFormFields form={form} onChange={setForm} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
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
