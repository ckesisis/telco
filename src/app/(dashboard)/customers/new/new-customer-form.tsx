"use client";

import { useRouter } from "next/navigation";
import { CustomerCreateForm } from "@/components/customers/customer-create-form";

export function NewCustomerForm({ defaultPhone = "" }: { defaultPhone?: string }) {
  const router = useRouter();

  return (
    <CustomerCreateForm
      defaultPhone={defaultPhone}
      onSuccess={(customer) => router.push(`/customers/${customer.id}`)}
    />
  );
}
