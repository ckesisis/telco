import { requireAuthContext } from "@/lib/tenancy";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NewCustomerForm } from "./new-customer-form";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  await requireAuthContext();
  const params = await searchParams;

  return (
    <div>
      <PageHeader title="Νέος Πελάτης" />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <NewCustomerForm defaultPhone={params.phone ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
