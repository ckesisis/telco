"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerCreateForm } from "@/components/customers/customer-create-form";
import { CustomerEditForm } from "@/components/customers/customer-edit-form";
import {
  CustomerSearchSelect,
  type CustomerOption,
} from "@/components/customers/customer-search-select";
import { customerHomeToOrderAddress } from "@/components/customers/customer-form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { PRODUCT_LINE_LABELS, PRODUCT_LINES } from "@/config/product-lines";
import {
  APPLICATION_TYPE_LABELS,
  PREPAID_APPLICATION_TYPES,
  PREVIOUS_PROVIDERS,
} from "@/config/application-types";
import type { ApplicationType } from "@/generated/prisma/client";

type Source = { id: string; name: string };
type Offer = { id: string; name: string; productLine: string; code: string };
type ApplicationFormState = {
  productLine: string;
  applicationType: ApplicationType;
  portingNumber: string;
  previousProvider: string;
  offerId: string;
  agreedMonthlyAmount: string;
};

const emptyApplication = (): ApplicationFormState => ({
  productLine: "prepaid_mobile",
  applicationType: "new_number",
  portingNumber: "",
  previousProvider: "",
  offerId: "",
  agreedMonthlyAmount: "",
});

type FieldErrors = Record<string, string>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}

function applicationFieldKey(index: number, field: string) {
  return `applications.${index}.${field}`;
}

export default function NewOrderForm({
  customers: initialCustomers,
  sources,
  offers,
  preselectedCustomerId,
  preselectedLeadId,
}: {
  customers: CustomerOption[];
  sources: Source[];
  offers: Offer[];
  preselectedCustomerId?: string;
  preselectedLeadId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [customers, setCustomers] = useState(initialCustomers);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [customerId, setCustomerId] = useState(preselectedCustomerId ?? initialCustomers[0]?.id ?? "");
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [address, setAddress] = useState({
    street: "", number: "", city: "", postalCode: "", region: "",
  });
  const [applications, setApplications] = useState<ApplicationFormState[]>([
    emptyApplication(),
  ]);

  function clearFieldError(name: string) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function updateApp(index: number, field: keyof ApplicationFormState, value: string) {
    const next = [...applications];
    const current = { ...next[index], [field]: value };
    if (field === "applicationType" && value === "new_number") {
      current.portingNumber = "";
      current.previousProvider = "";
      clearFieldError(applicationFieldKey(index, "portingNumber"));
      clearFieldError(applicationFieldKey(index, "previousProvider"));
    }
    next[index] = current;
    setApplications(next);
    clearFieldError(applicationFieldKey(index, field));
  }

  function validateStep1(): FieldErrors {
    const errors: FieldErrors = {};
    if (!customerId) errors.customerId = "Επιλέξτε πελάτη";
    if (!sourceId) errors.sourceId = "Επιλέξτε πηγή";
    return errors;
  }

  function validateStep2(): FieldErrors {
    const errors: FieldErrors = {};
    if (!address.street.trim()) errors.street = "Συμπληρώστε οδό";
    if (!address.city.trim()) errors.city = "Συμπληρώστε πόλη";
    if (!address.postalCode.trim()) errors.postalCode = "Συμπληρώστε Τ.Κ.";
    return errors;
  }

  function validateStep3(): FieldErrors {
    const errors: FieldErrors = {};
    applications.forEach((app, index) => {
      if (!app.offerId) {
        errors[applicationFieldKey(index, "offerId")] = "Επιλέξτε προσφορά";
      }
      if (
        app.productLine === "prepaid_mobile" &&
        app.applicationType === "portability"
      ) {
        if (!app.portingNumber.trim()) {
          errors[applicationFieldKey(index, "portingNumber")] = "Συμπληρώστε αριθμό φορητότητας";
        }
        if (!app.previousProvider) {
          errors[applicationFieldKey(index, "previousProvider")] = "Επιλέξτε προηγούμενο πάροχο";
        }
      }
    });
    return errors;
  }

  function goToStep(next: number) {
    const errors =
      step === 1 && next > 1
        ? validateStep1()
        : step === 2 && next > 2
          ? validateStep2()
          : {};

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (step === 1 && next === 2) {
      const customer = customers.find((c) => c.id === customerId);
      const addressEmpty =
        !address.street.trim() &&
        !address.city.trim() &&
        !address.postalCode.trim();
      if (customer && addressEmpty && customer.homeStreet) {
        setAddress(customerHomeToOrderAddress(customer));
      }
    }

    setFieldErrors({});
    setStep(next);
  }

  async function handleSubmit() {
    setLoading(true);

    const errors = validateStep3();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    setFieldErrors({});
    const res = await fetch("/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        sourceId,
        leadId: preselectedLeadId,
        shippingAddress: address,
        applications: applications.map((a) => ({
          productLine: a.productLine,
          applicationType: a.productLine === "prepaid_mobile" ? a.applicationType : null,
          portingNumber:
            a.productLine === "prepaid_mobile" && a.applicationType === "portability"
              ? a.portingNumber || null
              : null,
          previousProvider:
            a.productLine === "prepaid_mobile" && a.applicationType === "portability"
              ? a.previousProvider || null
              : null,
          agreedMonthlyAmount: a.agreedMonthlyAmount ? parseFloat(a.agreedMonthlyAmount) : null,
          offerId: a.offerId || null,
        })),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setFieldErrors({ _form: data.error ?? "Σφάλμα" });
      setLoading(false);
      return;
    }
    const order = await res.json();
    router.push(`/orders/${order.id}`);
  }

  const filteredOffers = (line: string) => offers.filter((o) => o.productLine === line);

  return (
    <div>
      <PageHeader title="Νέα Παραγγελία" description={`Βήμα ${step} από 3`} />
      <Card className="max-w-2xl">
        <CardContent className="space-y-4 pt-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Πελάτης</Label>
                <div className="flex gap-2">
                  <CustomerSearchSelect
                    value={customerId}
                    onValueChange={(value) => {
                      setCustomerId(value);
                      clearFieldError("customerId");
                    }}
                    customers={customers}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditCustomerOpen(true)}
                    disabled={!customerId}
                    aria-label="Επεξεργασία πελάτη"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateCustomerOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Νέος
                  </Button>
                </div>
                <FieldError message={fieldErrors.customerId} />
              </div>
              <div className="space-y-2">
                <Label>Πηγή</Label>
                <Select
                  value={sourceId}
                  onValueChange={(value) => {
                    setSourceId(value);
                    clearFieldError("sourceId");
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={fieldErrors.sourceId} />
              </div>
              <Button onClick={() => goToStep(2)}>Επόμενο</Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Οδός *</Label>
                  <Input
                    value={address.street}
                    onChange={(e) => {
                      setAddress({ ...address, street: e.target.value });
                      clearFieldError("street");
                    }}
                    required
                  />
                  <FieldError message={fieldErrors.street} />
                </div>
                <div className="space-y-2">
                  <Label>Αριθμός</Label>
                  <Input value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Πόλη *</Label>
                  <Input
                    value={address.city}
                    onChange={(e) => {
                      setAddress({ ...address, city: e.target.value });
                      clearFieldError("city");
                    }}
                    required
                  />
                  <FieldError message={fieldErrors.city} />
                </div>
                <div className="space-y-2">
                  <Label>Τ.Κ. *</Label>
                  <Input
                    value={address.postalCode}
                    onChange={(e) => {
                      setAddress({ ...address, postalCode: e.target.value });
                      clearFieldError("postalCode");
                    }}
                    required
                  />
                  <FieldError message={fieldErrors.postalCode} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setFieldErrors({}); setStep(1); }}>Πίσω</Button>
                <Button onClick={() => goToStep(3)}>Επόμενο</Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {applications.map((app, i) => (
                <div key={i} className="space-y-3 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label>Γραμμή Προϊόντος</Label>
                    <Select value={app.productLine} onValueChange={(v) => updateApp(i, "productLine", v)}>
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
                    <Select value={app.offerId} onValueChange={(v) => updateApp(i, "offerId", v)}>
                      <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                      <SelectContent>
                        {filteredOffers(app.productLine).map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors[applicationFieldKey(i, "offerId")]} />
                  </div>
                  {app.productLine === "prepaid_mobile" && (
                    <>
                      <div className="space-y-2">
                        <Label>Τύπος Αίτησης</Label>
                        <Select
                          value={app.applicationType}
                          onValueChange={(v) => updateApp(i, "applicationType", v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PREPAID_APPLICATION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {APPLICATION_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {app.applicationType === "portability" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Αριθμός Φορητότητας *</Label>
                            <Input
                              value={app.portingNumber}
                              onChange={(e) => updateApp(i, "portingNumber", e.target.value)}
                              required
                            />
                            <FieldError message={fieldErrors[applicationFieldKey(i, "portingNumber")]} />
                          </div>
                          <div className="space-y-2">
                            <Label>Προηγούμενος Πάροχος *</Label>
                            <Select
                              value={app.previousProvider}
                              onValueChange={(v) => updateApp(i, "previousProvider", v)}
                            >
                              <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                              <SelectContent>
                                {PREVIOUS_PROVIDERS.map((provider) => (
                                  <SelectItem key={provider} value={provider}>
                                    {provider}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldError message={fieldErrors[applicationFieldKey(i, "previousProvider")]} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {app.productLine !== "prepaid_mobile" && (
                    <div className="space-y-2">
                      <Label>Συμφωνημένο ποσό</Label>
                      <Input value={app.agreedMonthlyAmount} onChange={(e) => updateApp(i, "agreedMonthlyAmount", e.target.value)} />
                    </div>
                  )}
                </div>
              ))}
              <FieldError message={fieldErrors._form} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setFieldErrors({}); setStep(2); }}>Πίσω</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Αποθήκευση..." : "Δημιουργία"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Νέος Πελάτης</DialogTitle>
            <DialogDescription>
              Δημιουργήστε νέο πελάτη και επιλέξτε τον αυτόματα για την παραγγελία.
            </DialogDescription>
          </DialogHeader>
          <CustomerCreateForm
            key={createCustomerOpen ? "open" : "closed"}
            onCancel={() => setCreateCustomerOpen(false)}
            onSuccess={(customer) => {
              setCustomers((prev) => [customer, ...prev]);
              setCustomerId(customer.id);
              setCreateCustomerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editCustomerOpen} onOpenChange={setEditCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Επεξεργασία Πελάτη</DialogTitle>
            <DialogDescription>
              Ενημερώστε τα στοιχεία του επιλεγμένου πελάτη.
            </DialogDescription>
          </DialogHeader>
          {customerId && (
            <CustomerEditForm
              key={editCustomerOpen ? customerId : "closed"}
              customerId={customerId}
              sources={sources}
              onCancel={() => setEditCustomerOpen(false)}
              onSuccess={(customer) => {
                setCustomers((prev) =>
                  prev.map((c) => (c.id === customer.id ? customer : c))
                );
                setCustomerId(customer.id);
                setEditCustomerOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
