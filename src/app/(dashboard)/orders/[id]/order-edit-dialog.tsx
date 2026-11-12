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

type ContractDelivery = "courier" | "esign";
type ESignChannel = "email" | "sms";
type Address = {
  street: string;
  number: string;
  city: string;
  postalCode: string;
  region: string;
  floor: string;
  notes: string;
};

export type EditableOrder = {
  id: string;
  sourceId: string | null;
  notes: string | null;
  contractDelivery: ContractDelivery;
  esignChannel: ESignChannel | null;
  esignEmail: string | null;
  esignPhone: string | null;
  shippingAddress: {
    street: string;
    number: string | null;
    city: string;
    postalCode: string;
    region: string | null;
    floor: string | null;
    notes: string | null;
  } | null;
};

const NONE = "__none__";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{10,15}$/;

const ADDRESS_FIELDS: { key: keyof Address; label: string; required?: boolean }[] = [
  { key: "street", label: "Οδός", required: true },
  { key: "number", label: "Αριθμός" },
  { key: "city", label: "Πόλη", required: true },
  { key: "postalCode", label: "Τ.Κ.", required: true },
  { key: "region", label: "Περιοχή" },
  { key: "floor", label: "Όροφος" },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}

export function OrderEditDialog({
  order,
  sources,
}: {
  order: EditableOrder;
  sources: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Επεξεργασία
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Επεξεργασία Παραγγελίας</DialogTitle>
            <DialogDescription>Πηγή, σημειώσεις και αποστολή συμβολαίου.</DialogDescription>
          </DialogHeader>
          {open && <OrderEditForm order={order} sources={sources} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrderEditForm({
  order,
  sources,
  onDone,
}: {
  order: EditableOrder;
  sources: { id: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState(order.sourceId ?? NONE);
  const [notes, setNotes] = useState(order.notes ?? "");
  const [delivery, setDelivery] = useState<ContractDelivery>(order.contractDelivery);
  const [esignChannel, setEsignChannel] = useState<ESignChannel>(order.esignChannel ?? "email");
  const [esignEmail, setEsignEmail] = useState(order.esignEmail ?? "");
  const [esignPhone, setEsignPhone] = useState(order.esignPhone ?? "");
  const [address, setAddress] = useState<Address>({
    street: order.shippingAddress?.street ?? "",
    number: order.shippingAddress?.number ?? "",
    city: order.shippingAddress?.city ?? "",
    postalCode: order.shippingAddress?.postalCode ?? "",
    region: order.shippingAddress?.region ?? "",
    floor: order.shippingAddress?.floor ?? "",
    notes: order.shippingAddress?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (delivery === "esign") {
      if (esignChannel === "email") {
        if (!EMAIL_PATTERN.test(esignEmail.trim())) next.esignEmail = "Μη έγκυρο email";
      } else if (!PHONE_PATTERN.test(esignPhone.replace(/[\s-]/g, ""))) {
        next.esignPhone = "Μη έγκυρος αριθμός";
      }
    } else {
      for (const field of ADDRESS_FIELDS) {
        if (field.required && !address[field.key].trim()) next[field.key] = `Συμπληρώστε ${field.label}`;
      }
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
        action: "update-order",
        id: order.id,
        sourceId: sourceId === NONE ? null : sourceId,
        notes,
        contractDelivery: delivery,
        esignChannel: delivery === "esign" ? esignChannel : null,
        esignEmail: delivery === "esign" && esignChannel === "email" ? esignEmail : null,
        esignPhone: delivery === "esign" && esignChannel === "sms" ? esignPhone : null,
        shippingAddress: delivery === "courier" ? address : null,
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
      <div className="space-y-2">
        <Label>Πηγή</Label>
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Αποστολή συμβολαίου</Label>
        <Select
          value={delivery}
          onValueChange={(v) => {
            setDelivery(v as ContractDelivery);
            setErrors({});
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="courier">Courier</SelectItem>
            <SelectItem value="esign">eSign</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {delivery === "esign" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Αποστολή eSign μέσω</Label>
            <Select
              value={esignChannel}
              onValueChange={(v) => {
                setEsignChannel(v as ESignChannel);
                setErrors({});
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {esignChannel === "email" ? (
            <div className="space-y-2">
              <Label>Email για eSign *</Label>
              <Input type="email" value={esignEmail} onChange={(e) => setEsignEmail(e.target.value)} />
              <FieldError message={errors.esignEmail} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Κινητό για eSign *</Label>
              <Input type="tel" value={esignPhone} onChange={(e) => setEsignPhone(e.target.value)} />
              <FieldError message={errors.esignPhone} />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {ADDRESS_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label>{field.label}{field.required && " *"}</Label>
              <Input
                value={address[field.key]}
                onChange={(e) => setAddress({ ...address, [field.key]: e.target.value })}
              />
              <FieldError message={errors[field.key]} />
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <Label>Παρατηρήσεις Courier</Label>
            <Textarea
              value={address.notes}
              onChange={(e) => setAddress({ ...address, notes: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Σημειώσεις Παραγγελίας</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
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
