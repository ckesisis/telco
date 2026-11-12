"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  lineHasApplicationNumber,
  lineHasSimCard,
  lineSupportsPortability,
  PRODUCT_LINE_LABELS,
  PRODUCT_LINES,
} from "@/config/product-lines";
import {
  APPLICATION_TYPE_LABELS,
  PREPAID_APPLICATION_TYPES,
  PREVIOUS_PROVIDERS,
} from "@/config/application-types";
import { readPortingNumber } from "@/lib/phone";
import { amountDraft, readAmount } from "@/lib/utils";
import type { EditableApplication, EditableOffer } from "./editable-application";

const NONE = "__none__";

type FormState = {
  productLine: string;
  applicationType: string;
  portingNumber: string;
  previousProvider: string;
  offerId: string;
  agreedMonthlyAmount: string;
  isGift: boolean;
  msisdn: string;
  msisdnSn: string;
  registrationCode: string;
  applicationNumber: string;
  simCard: string;
  loopNumber: string;
  billingNotificationType: string;
  notes: string;
  pendingReason: string;
  cancellationReason: string;
};

function initialState(app: EditableApplication): FormState {
  return {
    productLine: app.productLine,
    applicationType: app.applicationType ?? "new_number",
    portingNumber: app.portingNumber ?? "",
    previousProvider: app.previousProvider ?? "",
    offerId: app.offerId ?? "",
    agreedMonthlyAmount: app.agreedMonthlyAmount ?? "",
    isGift: app.isGift,
    msisdn: app.msisdn ?? "",
    msisdnSn: app.msisdnSn ?? "",
    registrationCode: app.registrationCode ?? "",
    applicationNumber: app.applicationNumber ?? "",
    simCard: app.simCard ?? "",
    loopNumber: app.loopNumber ?? "",
    billingNotificationType: app.billingNotificationType ?? NONE,
    notes: app.notes ?? "",
    pendingReason: app.pendingReason ?? "",
    cancellationReason: app.cancellationReason ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}

export function ApplicationEditDialog({
  application,
  offers,
  title,
  trigger = "icon",
  canEditBackOffice,
}: {
  application: EditableApplication;
  offers: EditableOffer[];
  title?: string;
  trigger?: "icon" | "button";
  /** Admins and back office fill the provider-side fields; others see them read-only. */
  canEditBackOffice: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          aria-label="Επεξεργασία αίτησης"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" />
          Επεξεργασία
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title ?? "Επεξεργασία Αίτησης"}</DialogTitle>
            <DialogDescription>Ενημερώστε τα στοιχεία της αίτησης.</DialogDescription>
          </DialogHeader>
          {open && (
            <ApplicationEditForm
              application={application}
              offers={offers}
              canEditBackOffice={canEditBackOffice}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApplicationEditForm({
  application,
  offers,
  canEditBackOffice,
  onDone,
}: {
  application: EditableApplication;
  offers: EditableOffer[];
  canEditBackOffice: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => initialState(application));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const portable = lineSupportsPortability(form.productLine);
  const isPortability = portable && form.applicationType === "portability";
  const lineOffers = offers.filter((offer) => offer.productLine === form.productLine);
  const hasApplicationNumber = lineHasApplicationNumber(form.productLine);
  const hasSimCard = lineHasSimCard(form.productLine);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "productLine" && value !== prev.productLine) next.offerId = "";
      if (key === "applicationType" && value === "new_number") {
        next.portingNumber = "";
        next.previousProvider = "";
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.offerId) next.offerId = "Επιλέξτε προσφορά";
    if (isPortability) {
      try {
        if (!readPortingNumber(form.portingNumber)) {
          next.portingNumber = "Συμπληρώστε τον αριθμό που θα γίνει φορητότητα";
        }
      } catch (err) {
        next.portingNumber = err instanceof Error ? err.message : "Μη έγκυρος αριθμός";
      }
      if (!form.previousProvider) next.previousProvider = "Επιλέξτε προηγούμενο πάροχο";
    }
    try {
      readAmount(form.agreedMonthlyAmount);
    } catch (err) {
      next.agreedMonthlyAmount = err instanceof Error ? err.message : "Μη έγκυρο ποσό";
    }
    return next;
  }

  async function handleSave() {
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-application",
        id: application.id,
        productLine: form.productLine,
        applicationType: portable ? form.applicationType : null,
        portingNumber: isPortability ? readPortingNumber(form.portingNumber) : null,
        previousProvider: isPortability ? form.previousProvider : null,
        offerId: form.offerId || null,
        agreedMonthlyAmount: readAmount(form.agreedMonthlyAmount),
        isGift: form.isGift,
        msisdn: form.msisdn,
        msisdnSn: form.msisdnSn,
        registrationCode: form.registrationCode,
        applicationNumber: hasApplicationNumber ? form.applicationNumber : null,
        simCard: hasSimCard ? form.simCard : null,
        loopNumber: form.loopNumber,
        billingNotificationType:
          form.billingNotificationType === NONE ? null : form.billingNotificationType,
        notes: form.notes,
        pendingReason: form.pendingReason,
        cancellationReason: form.cancellationReason,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrors({ _form: data.error ?? "Σφάλμα αποθήκευσης" });
      return;
    }
    onDone();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Γραμμή Προϊόντος</Label>
          <Select value={form.productLine} onValueChange={(v) => set("productLine", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRODUCT_LINES.map((line) => (
                <SelectItem key={line} value={line}>{PRODUCT_LINE_LABELS[line]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Προσφορά *</Label>
          <Select value={form.offerId} onValueChange={(v) => set("offerId", v)}>
            <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
            <SelectContent>
              {lineOffers.map((offer) => (
                <SelectItem key={offer.id} value={offer.id}>{offer.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.offerId} />
        </div>
      </div>

      {portable && (
        <div className="space-y-2">
          <Label>Τύπος Αίτησης</Label>
          <Select value={form.applicationType} onValueChange={(v) => set("applicationType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PREPAID_APPLICATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{APPLICATION_TYPE_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isPortability && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Αριθμός προς φορητότητα *</Label>
            <Input
              inputMode="tel"
              placeholder="69xxxxxxxx ή 2xxxxxxxxx"
              value={form.portingNumber}
              onChange={(e) => set("portingNumber", e.target.value)}
            />
            <FieldError message={errors.portingNumber} />
          </div>
          <div className="space-y-2">
            <Label>Προηγούμενος Πάροχος *</Label>
            <Select value={form.previousProvider} onValueChange={(v) => set("previousProvider", v)}>
              <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
              <SelectContent>
                {PREVIOUS_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.previousProvider} />
          </div>
        </div>
      )}

      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-sm font-medium text-slate-900">Back Office</legend>
        {!canEditBackOffice && (
          <p className="text-xs text-slate-500">Τα πεδία συμπληρώνονται από το Back Office.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Κωδικός Καταχώρησης</Label>
            <Input
              value={form.registrationCode}
              onChange={(e) => set("registrationCode", e.target.value)}
              disabled={!canEditBackOffice}
              className="bg-white"
            />
          </div>
          {hasApplicationNumber && (
            <div className="space-y-2">
              <Label>Αρ. Αίτησης</Label>
              <Input
                value={form.applicationNumber}
                onChange={(e) => set("applicationNumber", e.target.value)}
                disabled={!canEditBackOffice}
                className="bg-white"
              />
            </div>
          )}
          {hasSimCard && (
            <div className="space-y-2">
              <Label>Κάρτα SIM</Label>
              <Input
                value={form.simCard}
                onChange={(e) => set("simCard", e.target.value)}
                disabled={!canEditBackOffice}
                className="bg-white"
              />
            </div>
          )}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>MSISDN</Label>
          <Input value={form.msisdn} onChange={(e) => set("msisdn", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>MSISDN SN</Label>
          <Input value={form.msisdnSn} onChange={(e) => set("msisdnSn", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Συμφωνημένο ποσό (€)</Label>
          <Input
            inputMode="decimal"
            placeholder="π.χ. 29,99"
            value={form.agreedMonthlyAmount}
            onChange={(e) => set("agreedMonthlyAmount", amountDraft(e.target.value))}
          />
          <FieldError message={errors.agreedMonthlyAmount} />
        </div>
        <div className="space-y-2">
          <Label>Αρ. Βρόχου</Label>
          <Input value={form.loopNumber} onChange={(e) => set("loopNumber", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Ειδοποίηση Λογαριασμού</Label>
          <Select
            value={form.billingNotificationType}
            onValueChange={(v) => set("billingNotificationType", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={form.isGift}
            onChange={(e) => set("isGift", e.target.checked)}
          />
          Δώρο
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Λόγος Εκκρεμότητας</Label>
          <Input value={form.pendingReason} onChange={(e) => set("pendingReason", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Λόγος Ακύρωσης</Label>
          <Input
            value={form.cancellationReason}
            onChange={(e) => set("cancellationReason", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Σχόλια</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <FieldError message={errors._form} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>Άκυρο</Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </div>
    </div>
  );
}
