"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from "@/config/document-types";
import type { DocumentType } from "@/generated/prisma/client";

export type CustomerFormValues = {
  firstName: string;
  lastName: string;
  fatherName: string;
  vatNumber: string;
  contactPhone: string;
  documentType: DocumentType;
  documentNumber: string;
  documentIssuer: string;
  homeStreet: string;
  homeNumber: string;
  homeCity: string;
  homePostalCode: string;
  homeRegion: string;
  notes: string;
  sourceId: string;
};

type Source = { id: string; name: string };

type CustomerFormFieldsProps = {
  form: CustomerFormValues;
  onChange: (values: CustomerFormValues) => void;
  sources?: Source[];
};

export function CustomerFormFields({ form, onChange, sources }: CustomerFormFieldsProps) {
  function setField<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Όνομα *</Label>
          <Input
            value={form.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Επώνυμο *</Label>
          <Input
            value={form.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Πατρώνυμο</Label>
        <Input
          value={form.fatherName}
          onChange={(e) => setField("fatherName", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Τηλέφωνο *</Label>
          <Input
            value={form.contactPhone}
            onChange={(e) => setField("contactPhone", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>ΑΦΜ</Label>
          <Input
            value={form.vatNumber}
            onChange={(e) => setField("vatNumber", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Τύπος Εγγράφου</Label>
          <Select
            value={form.documentType}
            onValueChange={(v) => setField("documentType", v as DocumentType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {DOCUMENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Αριθμός Εγγράφου</Label>
          <Input
            value={form.documentNumber}
            onChange={(e) => setField("documentNumber", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Εκδούσα Αρχή</Label>
        <Input
          value={form.documentIssuer}
          onChange={(e) => setField("documentIssuer", e.target.value)}
        />
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-900">Διεύθυνση Κατοικίας</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Οδός</Label>
            <Input
              value={form.homeStreet}
              onChange={(e) => setField("homeStreet", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Αριθμός</Label>
            <Input
              value={form.homeNumber}
              onChange={(e) => setField("homeNumber", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Πόλη</Label>
            <Input
              value={form.homeCity}
              onChange={(e) => setField("homeCity", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Τ.Κ.</Label>
            <Input
              value={form.homePostalCode}
              onChange={(e) => setField("homePostalCode", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Περιοχή</Label>
          <Input
            value={form.homeRegion}
            onChange={(e) => setField("homeRegion", e.target.value)}
          />
        </div>
      </div>

      {sources && (
        <div className="space-y-2">
          <Label>Πηγή</Label>
          <Select
            value={form.sourceId || "__none__"}
            onValueChange={(v) => setField("sourceId", v === "__none__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Χωρίς πηγή" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Χωρίς πηγή</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Σημειώσεις</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

export function customerToFormValues(customer: {
  firstName: string;
  lastName: string;
  fatherName?: string | null;
  vatNumber?: string | null;
  contactPhone: string;
  documentType: DocumentType;
  documentNumber?: string | null;
  documentIssuer?: string | null;
  homeStreet?: string | null;
  homeNumber?: string | null;
  homeCity?: string | null;
  homePostalCode?: string | null;
  homeRegion?: string | null;
  notes?: string | null;
  sourceId?: string | null;
}): CustomerFormValues {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    fatherName: customer.fatherName ?? "",
    vatNumber: customer.vatNumber ?? "",
    contactPhone: customer.contactPhone,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber ?? "",
    documentIssuer: customer.documentIssuer ?? "",
    homeStreet: customer.homeStreet ?? "",
    homeNumber: customer.homeNumber ?? "",
    homeCity: customer.homeCity ?? "",
    homePostalCode: customer.homePostalCode ?? "",
    homeRegion: customer.homeRegion ?? "",
    notes: customer.notes ?? "",
    sourceId: customer.sourceId ?? "",
  };
}

export function formValuesToPayload(form: CustomerFormValues) {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    fatherName: form.fatherName || null,
    vatNumber: form.vatNumber || null,
    contactPhone: form.contactPhone,
    documentType: form.documentType,
    documentNumber: form.documentNumber || null,
    documentIssuer: form.documentIssuer || null,
    homeStreet: form.homeStreet || null,
    homeNumber: form.homeNumber || null,
    homeCity: form.homeCity || null,
    homePostalCode: form.homePostalCode || null,
    homeRegion: form.homeRegion || null,
    notes: form.notes || null,
    sourceId: form.sourceId || null,
  };
}

export function customerHomeToOrderAddress(customer: {
  homeStreet?: string | null;
  homeNumber?: string | null;
  homeCity?: string | null;
  homePostalCode?: string | null;
  homeRegion?: string | null;
}) {
  return {
    street: customer.homeStreet ?? "",
    number: customer.homeNumber ?? "",
    city: customer.homeCity ?? "",
    postalCode: customer.homePostalCode ?? "",
    region: customer.homeRegion ?? "",
  };
}
