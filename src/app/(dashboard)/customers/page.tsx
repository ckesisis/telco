import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listCustomers } from "@/lib/services/customer.service";
import { PageHeader, DataTable } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const customers = await listCustomers(ctx.organizationId, ctx, query || undefined);

  return (
    <div>
      <PageHeader
        title="Πελάτες"
        description={
          query
            ? `${customers.length} αποτελέσματα για «${query}»`
            : "Κατάλογος πελατών"
        }
        action={
          <Button asChild>
            <Link href="/customers/new">Νέος Πελάτης</Link>
          </Button>
        }
      />
      <form method="get" className="mb-4 flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Αναζήτηση: επώνυμο, ΑΦΜ, αριθμός εγγράφου"
          className="max-w-md"
        />
        <Button type="submit">Αναζήτηση</Button>
        {query && (
          <Button asChild variant="outline">
            <Link href="/customers">Καθαρισμός</Link>
          </Button>
        )}
      </form>
      <DataTable
        headers={["Όνομα", "Τηλέφωνο", "ΑΦΜ", "Παραγγελίες", "Leads", ""]}
        rows={customers.map((c) => [
          `${c.firstName} ${c.lastName}`,
          c.contactPhone,
          c.vatNumber ?? "—",
          c._count.orders,
          c._count.leads,
          <Link key={c.id} href={`/customers/${c.id}`} className="text-sm text-blue-600 hover:underline">
            Προβολή
          </Link>,
        ])}
      />
    </div>
  );
}
