import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CopyFieldGroup, type CopyFieldDef } from "@/components/shared/copy-field";
import { DOCUMENT_TYPE_LABELS } from "@/config/document-types";
import type { getOrder } from "@/lib/services/order.service";
import { formatDate, formatDateTime } from "@/lib/utils";
import { formatAmount, OrderApplicationsTable, OrderHistoryTable } from "./order-applications-table";

type OrderRecord = NonNullable<Awaited<ReturnType<typeof getOrder>>>;
type Status = { id: string; name: string; color: string };

function yesNo(value: boolean | null | undefined) {
  if (value == null) return null;
  return value ? "Ναι" : "Όχι";
}

function orderFields(order: OrderRecord): CopyFieldDef[] {
  const isEsign = order.contractDelivery === "esign";
  return [
    { label: "Αριθμός Παραγγελίας", value: order.orderRef },
    { label: "Ημερομηνία", value: formatDateTime(order.orderDate) },
    { label: "Πωλητής", value: order.seller?.name ?? null },
    { label: "Κωδικός Πωλητή", value: order.salesCode },
    { label: "Πηγή", value: order.source?.name ?? null },
    {
      label: "Αποστολή Συμβολαίου",
      value: isEsign ? `eSign (${order.esignChannel === "sms" ? "SMS" : "Email"})` : "Courier",
    },
    { label: "Σημειώσεις Παραγγελίας", value: order.notes, wide: true },
  ];
}

function customerFields(customer: OrderRecord["customer"]): CopyFieldDef[] {
  return [
    { label: "Επώνυμο", value: customer.lastName },
    { label: "Όνομα", value: customer.firstName },
    { label: "Πατρώνυμο", value: customer.fatherName },
    { label: "ΑΦΜ", value: customer.vatNumber },
    { label: "Ημ. Γέννησης", value: customer.birthDate ? formatDate(customer.birthDate) : null },
    { label: "Χώρα Γέννησης", value: customer.birthCountry },
    { label: "Τύπος Εγγράφου", value: DOCUMENT_TYPE_LABELS[customer.documentType] },
    { label: "Αριθμός Εγγράφου", value: customer.documentNumber },
    { label: "Αρχή Έκδοσης", value: customer.documentIssuer },
    { label: "Τηλέφωνο Επικοινωνίας", value: customer.contactPhone },
    { label: "Συναίνεση Marketing", value: yesNo(customer.consentMarketing) },
    { label: "Πηγή Πελάτη", value: customer.source?.name ?? null },
    { label: "Σημειώσεις Πελάτη", value: customer.notes, wide: true },
  ];
}

function deliveryFields(order: OrderRecord): CopyFieldDef[] {
  if (order.contractDelivery === "esign") {
    return [
      { label: "Κανάλι eSign", value: order.esignChannel === "sms" ? "SMS" : "Email" },
      { label: "Email eSign", value: order.esignEmail },
      { label: "Κινητό eSign", value: order.esignPhone },
    ];
  }
  const address = order.shippingAddress;
  return [
    { label: "Οδός", value: address?.street ?? null },
    { label: "Αριθμός", value: address?.number ?? null },
    { label: "Πόλη", value: address?.city ?? null },
    { label: "ΤΚ", value: address?.postalCode ?? null },
    { label: "Περιοχή", value: address?.region ?? null },
    { label: "Όροφος", value: address?.floor ?? null },
    { label: "Παρατηρήσεις Courier", value: address?.notes ?? null, wide: true },
  ];
}

function homeFields(customer: OrderRecord["customer"]): CopyFieldDef[] {
  return [
    { label: "Οδός", value: customer.homeStreet },
    { label: "Αριθμός", value: customer.homeNumber },
    { label: "Πόλη", value: customer.homeCity },
    { label: "ΤΚ", value: customer.homePostalCode },
    { label: "Περιοχή", value: customer.homeRegion },
  ];
}

function leadFields(lead: NonNullable<OrderRecord["lead"]>): CopyFieldDef[] {
  return [
    { label: "Τηλέφωνο Lead", value: lead.phone },
    { label: "Email", value: lead.email },
    { label: "Κατάσταση", value: lead.status.name },
    { label: "Πηγή", value: lead.source.name },
    { label: "Agent", value: lead.assignedUser?.name ?? null },
    { label: "Προηγ. Πάροχος", value: lead.previousProvider },
    { label: "Καμπάνια", value: lead.campaignName },
    { label: "Ad Set", value: lead.adsetName },
    { label: "Διαφήμιση", value: lead.adName },
    { label: "Σημειώσεις Lead", value: lead.notes, wide: true },
  ];
}

const linkClass = "inline-flex h-7 items-center rounded px-2 text-xs font-medium text-blue-600 hover:bg-blue-50";

export function OrderView({ order, statuses }: { order: OrderRecord; statuses: Status[] }) {
  const { customer, lead, applications } = order;
  const total = applications.reduce(
    (sum, app) => sum + Number(app.agreedMonthlyAmount ?? app.offer?.catalogMonthlyAmount ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="divide-y divide-slate-100">
          <CopyFieldGroup title="Στοιχεία Παραγγελίας" fields={orderFields(order)} />
          <CopyFieldGroup
            title="Στοιχεία Πελάτη"
            fields={customerFields(customer)}
            action={<Link href={`/customers/${customer.id}`} className={linkClass}>Καρτέλα</Link>}
          />
        </Card>

        <div className="space-y-6">
          <Card className="divide-y divide-slate-100">
            <CopyFieldGroup
              title={order.contractDelivery === "esign" ? "Αποστολή eSign" : "Διεύθυνση Αποστολής"}
              fields={deliveryFields(order)}
            />
            <CopyFieldGroup title="Διεύθυνση Κατοικίας" fields={homeFields(customer)} />
          </Card>
          {lead && (
            <Card>
              <CopyFieldGroup
                title="Lead"
                fields={leadFields(lead)}
                action={<Link href={`/leads/${lead.id}`} className={linkClass}>Άνοιγμα</Link>}
              />
            </Card>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            Αιτήσεις <span className="font-normal text-slate-500">({applications.length})</span>
          </h2>
          <p className="text-sm text-slate-600">
            Σύνολο ποσών: <span className="font-semibold tabular-nums text-slate-900">{formatAmount(total)} €</span>
          </p>
        </div>
        <OrderApplicationsTable applications={applications} statuses={statuses} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Ιστορικό</h2>
        <OrderHistoryTable applications={applications} />
      </section>
    </div>
  );
}
