"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CustomerOption } from "@/components/customers/customer-search-select";
import {
  CustomerFormFields,
  customerToFormValues,
  formValuesToPayload,
  type CustomerFormValues,
} from "@/components/customers/customer-form-fields";
import type { DocumentType } from "@/generated/prisma/client";

type Source = { id: string; name: string };

type CustomerEditFormProps = {
  customerId: string;
  sources?: Source[];
  onSuccess: (customer: CustomerOption) => void;
  onCancel?: () => void;
};

function toCustomerOption(customer: {
  id: string;
  firstName: string;
  lastName: string;
  contactPhone: string;
  vatNumber?: string | null;
  documentNumber?: string | null;
  documentType: DocumentType;
  homeStreet?: string | null;
  homeNumber?: string | null;
  homeCity?: string | null;
  homePostalCode?: string | null;
  homeRegion?: string | null;
}): CustomerOption {
  return {
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
  };
}

export function CustomerEditForm({
  customerId,
  sources,
  onSuccess,
  onCancel,
}: CustomerEditFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CustomerFormValues | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomer() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/v1/customers?id=${encodeURIComponent(customerId)}`);
        if (!res.ok) {
          throw new Error("Δεν βρέθηκε ο πελάτης");
        }
        const customer = await res.json();
        if (!cancelled) {
          setForm(customerToFormValues(customer));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Σφάλμα φόρτωσης");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCustomer();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    setSaving(true);
    setError("");

    const res = await fetch("/api/v1/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: customerId,
        ...formValuesToPayload(form),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Σφάλμα");
      setSaving(false);
      return;
    }

    const customer = await res.json();
    onSuccess(toCustomerOption(customer));
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Φόρτωση στοιχείων πελάτη...</p>;
  }

  if (!form) {
    return (
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {onCancel && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Κλείσιμο
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CustomerFormFields form={form} onChange={setForm} sources={sources} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Ακύρωση
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}
