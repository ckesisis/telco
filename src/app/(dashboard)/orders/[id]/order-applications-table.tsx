import { DataTable } from "@/components/shared/page-header";
import { AppStatusSelect } from "@/components/shared/app-status-select";
import { CopyButton } from "@/components/shared/copy-field";
import { APPLICATION_TYPE_LABELS } from "@/config/application-types";
import {
  lineHasApplicationNumber,
  lineHasSimCard,
  PRODUCT_LINE_LABELS,
} from "@/config/product-lines";
import type { getOrder } from "@/lib/services/order.service";
import { formatDateTime } from "@/lib/utils";
import { ApplicationEditDialog } from "@/components/orders/application-edit-dialog";
import {
  toEditableApplication,
  type EditableOffer,
} from "@/components/orders/editable-application";

type Application = NonNullable<Awaited<ReturnType<typeof getOrder>>>["applications"][number];
type Status = { id: string; name: string; color: string };
type Column = {
  header: string;
  cell: (app: Application, index: number) => React.ReactNode;
  show?: (apps: Application[]) => boolean;
};

const BILLING_LABELS = { email: "Email", sms: "SMS" } as const;

export function formatAmount(value: { toString(): string } | null | undefined) {
  if (value == null) return null;
  return Number(value.toString()).toLocaleString("el-GR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function installationAddress(app: Application) {
  const address = app.installationAddress;
  if (!address) return null;
  return [
    [address.street, address.number].filter(Boolean).join(" "),
    [address.postalCode, address.city, address.region].filter(Boolean).join(" "),
    address.floor && `Όροφος ${address.floor}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function Copyable({ label, value }: { label: string; value: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap tabular-nums">
      <span className="select-all">{value}</span>
      <CopyButton value={value} label={label} />
    </span>
  );
}

function Plain({ value }: { value: React.ReactNode }) {
  return value == null || value === "" ? <span className="text-slate-400">—</span> : <>{value}</>;
}

function any(key: (app: Application) => unknown) {
  return (apps: Application[]) => apps.some((app) => Boolean(key(app)));
}

function columns(statuses: Status[]): Column[] {
  return [
    { header: "#", cell: (_app, index) => <span className="tabular-nums text-slate-500">{index + 1}</span> },
    { header: "Γραμμή", cell: (app) => PRODUCT_LINE_LABELS[app.productLine] },
    { header: "Προσφορά", cell: (app) => <Plain value={app.offer?.name} /> },
    {
      header: "Τύπος",
      cell: (app) => <Plain value={app.applicationType && APPLICATION_TYPE_LABELS[app.applicationType]} />,
    },
    {
      header: "Κατάσταση",
      cell: (app) => (
        <div className="w-44">
          <AppStatusSelect applicationId={app.id} currentStatusId={app.statusId} statuses={statuses} />
        </div>
      ),
    },
    {
      header: "Κωδικός Καταχώρησης",
      cell: (app) => <Copyable label="Κωδικός Καταχώρησης" value={app.registrationCode} />,
    },
    {
      header: "Αρ. Αίτησης",
      show: (apps) => apps.some((app) => lineHasApplicationNumber(app.productLine)),
      cell: (app) =>
        lineHasApplicationNumber(app.productLine) ? (
          <Copyable label="Αρ. Αίτησης" value={app.applicationNumber} />
        ) : (
          <span className="text-slate-300">n/a</span>
        ),
    },
    {
      header: "Κάρτα SIM",
      show: (apps) => apps.some((app) => lineHasSimCard(app.productLine)),
      cell: (app) =>
        lineHasSimCard(app.productLine) ? (
          <Copyable label="Κάρτα SIM" value={app.simCard} />
        ) : (
          <span className="text-slate-300">n/a</span>
        ),
    },
    { header: "Αρ. Φορητότητας", cell: (app) => <Copyable label="Αρ. Φορητότητας" value={app.portingNumber} /> },
    { header: "Πάροχος", cell: (app) => <Plain value={app.previousProvider} /> },
    { header: "MSISDN", cell: (app) => <Copyable label="MSISDN" value={app.msisdn} /> },
    { header: "MSISDN SN", cell: (app) => <Copyable label="MSISDN SN" value={app.msisdnSn} /> },
    {
      header: "Ποσό (€)",
      cell: (app) => (
        <Copyable
          label="Ποσό"
          value={formatAmount(app.agreedMonthlyAmount ?? app.offer?.catalogMonthlyAmount)}
        />
      ),
    },
    { header: "Δώρο", cell: (app) => (app.isGift ? "Ναι" : "Όχι") },
    {
      header: "Αρ. Βρόχου",
      show: any((app) => app.loopNumber),
      cell: (app) => <Copyable label="Αρ. Βρόχου" value={app.loopNumber} />,
    },
    {
      header: "Ειδοπ. Λογαριασμού",
      show: any((app) => app.billingNotificationType),
      cell: (app) => (
        <Plain value={app.billingNotificationType && BILLING_LABELS[app.billingNotificationType]} />
      ),
    },
    {
      header: "Διεύθυνση Εγκατάστασης",
      show: any((app) => app.installationAddress),
      cell: (app) => <Copyable label="Διεύθυνση Εγκατάστασης" value={installationAddress(app)} />,
    },
    {
      header: "Λόγος Εκκρεμότητας",
      show: any((app) => app.pendingReason),
      cell: (app) => <Plain value={app.pendingReason} />,
    },
    {
      header: "Λόγος Ακύρωσης",
      show: any((app) => app.cancellationReason),
      cell: (app) => <Plain value={app.cancellationReason} />,
    },
    {
      header: "Σχόλια",
      cell: (app) => (
        <span className="block min-w-48 max-w-72 whitespace-pre-wrap text-slate-700">
          <Plain value={app.notes} />
        </span>
      ),
    },
  ];
}

function editColumn(offers: EditableOffer[], canEditBackOffice: boolean): Column {
  return {
    header: "",
    cell: (app, index) => (
      <ApplicationEditDialog
        application={toEditableApplication(app)}
        offers={offers}
        canEditBackOffice={canEditBackOffice}
        title={`Επεξεργασία Αίτησης #${index + 1}`}
      />
    ),
  };
}

export function OrderApplicationsTable({
  applications,
  statuses,
  offers,
  canEdit,
  canEditBackOffice,
}: {
  applications: Application[];
  statuses: Status[];
  offers: EditableOffer[];
  canEdit: boolean;
  canEditBackOffice: boolean;
}) {
  const visible = [...columns(statuses), ...(canEdit ? [editColumn(offers, canEditBackOffice)] : [])].filter(
    (column) => !column.show || column.show(applications)
  );
  return (
    <DataTable
      headers={visible.map((column) => column.header)}
      rows={applications.map((app, index) => visible.map((column) => column.cell(app, index)))}
    />
  );
}

export function OrderHistoryTable({ applications }: { applications: Application[] }) {
  const logs = applications
    .flatMap((app, index) => app.logs.map((log) => ({ log, app, index })))
    .sort((a, b) => b.log.createdAt.getTime() - a.log.createdAt.getTime());

  return (
    <DataTable
      headers={["Αίτηση", "Ημερομηνία", "Χρήστης", "Περιγραφή"]}
      rows={logs.map(({ log, app, index }) => [
        `#${index + 1} · ${PRODUCT_LINE_LABELS[app.productLine]}`,
        <span key="date" className="whitespace-nowrap tabular-nums">{formatDateTime(log.createdAt)}</span>,
        log.user?.name ?? "—",
        log.message ?? log.action,
      ])}
    />
  );
}
