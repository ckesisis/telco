"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/page-header";

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  createdAtLabel: string;
  members: number;
  customers: number;
  leads: number;
  orders: number;
};

function suggestSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readError(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.error ?? "Σφάλμα";
}

export function OrganizationsAdmin({
  organizations,
  activeOrganizationId,
}: {
  organizations: OrganizationRow[];
  activeOrganizationId: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OrganizationRow | null>(null);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError("");

    const response = await fetch("/api/v1/platform/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });

    if (!response.ok) {
      setCreateError(await readError(response));
      setCreating(false);
      return;
    }

    setName("");
    setSlug("");
    setSlugTouched(false);
    setCreating(false);
    router.refresh();
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setEditError("");

    const response = await fetch("/api/v1/platform/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        name: editing.name,
        slug: editing.slug,
      }),
    });

    if (!response.ok) {
      setEditError(await readError(response));
      setSaving(false);
      return;
    }

    setEditing(null);
    setSaving(false);
    router.refresh();
  }

  async function enterOrganization(organizationId: string) {
    setActionError("");
    const response = await fetch("/api/v1/platform/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    if (!response.ok) {
      setActionError(await readError(response));
      return;
    }
    window.location.href = "/dashboard";
  }

  async function leaveOrganization() {
    setActionError("");
    const response = await fetch("/api/v1/platform/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: null }),
    });
    if (!response.ok) {
      setActionError(await readError(response));
      return;
    }
    window.location.href = "/admin";
  }

  async function handleDelete(organization: OrganizationRow) {
    const confirmed = window.confirm(
      `Διαγραφή του οργανισμού «${organization.name}»; Όλα τα δεδομένα του θα διαγραφούν.`
    );
    if (!confirmed) return;

    setActionError("");
    const response = await fetch("/api/v1/platform/organizations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: organization.id }),
    });
    if (!response.ok) {
      setActionError(await readError(response));
      return;
    }
    if (organization.id === activeOrganizationId) {
      window.location.href = "/admin";
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Νέος οργανισμός</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="org-name">Όνομα</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  if (!slugTouched) setSlug(suggestSlug(nextName));
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Δημιουργία..." : "Δημιουργία"}
              </Button>
            </div>
            {createError && (
              <p className="text-sm text-red-600 md:col-span-3">{createError}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Επεξεργασία</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveEdit} className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Όνομα</Label>
                <Input
                  id="edit-name"
                  value={editing.name}
                  onChange={(event) =>
                    setEditing({ ...editing, name: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  value={editing.slug}
                  onChange={(event) =>
                    setEditing({ ...editing, slug: event.target.value })
                  }
                  required
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Αποθήκευση..." : "Αποθήκευση"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Άκυρο
                </Button>
              </div>
              {editError && (
                <p className="text-sm text-red-600 md:col-span-3">{editError}</p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <DataTable
        headers={[
          "Όνομα",
          "Slug",
          "Μέλη",
          "Πελάτες",
          "Leads",
          "Παραγγελίες",
          "Δημιουργία",
          "",
        ]}
        rows={organizations.map((organization) => {
          const isActive = organization.id === activeOrganizationId;
          return [
            organization.name,
            organization.slug,
            organization.members,
            organization.customers,
            organization.leads,
            organization.orders,
            organization.createdAtLabel,
            <div key={organization.id} className="flex justify-end gap-2">
              {isActive ? (
                <Button size="sm" variant="outline" onClick={leaveOrganization}>
                  Έξοδος
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => enterOrganization(organization.id)}
                >
                  Είσοδος
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditError("");
                  setEditing(organization);
                }}
              >
                Επεξεργασία
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(organization)}
              >
                Διαγραφή
              </Button>
            </div>,
          ];
        })}
      />
    </div>
  );
}
