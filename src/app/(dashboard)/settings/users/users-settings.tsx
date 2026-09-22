"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASSIGNABLE_ROLES,
  ASSIGNABLE_ROLE_LABELS,
  ORG_ROLE_LABELS,
  type OrgRole,
} from "@/config/roles";

type Member = {
  userId: string;
  name: string;
  email: string;
  role: string;
  salesCode: string;
  contactPhone: string;
};

const emptyCreateForm = {
  name: "",
  email: "",
  password: "",
  role: "member" as const,
  salesCode: "",
  contactPhone: "",
};

export function UsersSettings({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [selected, setSelected] = useState(members[0]?.userId ?? "");
  const selectedMember = members.find((m) => m.userId === selected);
  const [editForm, setEditForm] = useState({
    name: selectedMember?.name ?? "",
    email: selectedMember?.email ?? "",
    password: "",
    role: selectedMember?.role ?? "member",
    salesCode: selectedMember?.salesCode ?? "",
    contactPhone: selectedMember?.contactPhone ?? "",
  });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (members.length === 0) return;
    const member =
      members.find((m) => m.userId === selected) ?? members[0];
    setSelected(member.userId);
    setEditForm({
      name: member.name,
      email: member.email,
      password: "",
      role: member.role,
      salesCode: member.salesCode,
      contactPhone: member.contactPhone,
    });
  }, [members]);

  function selectMember(userId: string) {
    setSelected(userId);
    const member = members.find((x) => x.userId === userId);
    setEditForm({
      name: member?.name ?? "",
      email: member?.email ?? "",
      password: "",
      role: member?.role ?? "member",
      salesCode: member?.salesCode ?? "",
      contactPhone: member?.contactPhone ?? "",
    });
    setEditError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    const res = await fetch("/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });

    if (!res.ok) {
      const data = await res.json();
      setCreateError(data.error ?? "Σφάλμα");
      setCreating(false);
      return;
    }

    setCreateForm(emptyCreateForm);
    setCreating(false);
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setEditError("");

    const res = await fetch("/api/v1/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selected, ...editForm }),
    });

    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error ?? "Σφάλμα");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  const isOwner = selectedMember?.role === "owner";
  const isSelf = selected === currentUserId;
  const roleEditable = !isOwner && !isSelf;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Νέος Χρήστης</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Όνομα *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Κωδικός *</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Ρόλος *</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) =>
                  setCreateForm({ ...createForm, role: v as typeof createForm.role })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ASSIGNABLE_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sales Code</Label>
              <Input
                value={createForm.salesCode}
                onChange={(e) => setCreateForm({ ...createForm, salesCode: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Τηλέφωνο{createForm.role === "member" ? " *" : ""}</Label>
              <Input
                value={createForm.contactPhone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, contactPhone: e.target.value })
                }
                required={createForm.role === "member"}
              />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <Button type="submit" disabled={creating}>
              {creating ? "Δημιουργία..." : "Δημιουργία Χρήστη"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Επεξεργασία Χρήστη</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="text-sm text-slate-500">Δεν υπάρχουν χρήστες.</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <Label>Χρήστης</Label>
                <Select value={selected} onValueChange={selectMember}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.name} ({m.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Όνομα *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Νέος κωδικός</Label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  minLength={8}
                  placeholder="Κενό για να μείνει ο ίδιος"
                />
              </div>

              <div className="space-y-1">
                <Label>Ρόλος</Label>
                {roleEditable ? (
                  <Select
                    value={
                      ASSIGNABLE_ROLES.includes(editForm.role as (typeof ASSIGNABLE_ROLES)[number])
                        ? editForm.role
                        : "member"
                    }
                    onValueChange={(v) => setEditForm({ ...editForm, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ASSIGNABLE_ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-slate-700">
                    {ORG_ROLE_LABELS[editForm.role as OrgRole] ?? editForm.role}
                    {isSelf && (
                      <span className="ml-2 text-slate-500">(δεν μπορείτε να αλλάξετε τον δικό σας ρόλο)</span>
                    )}
                    {isOwner && (
                      <span className="ml-2 text-slate-500">(ο ρόλος ιδιοκτήτη δεν αλλάζει)</span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Sales Code</Label>
                <Input
                  value={editForm.salesCode}
                  onChange={(e) => setEditForm({ ...editForm, salesCode: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Τηλέφωνο{editForm.role === "member" ? " *" : ""}</Label>
                <Input
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                  required={editForm.role === "member"}
                />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <Button type="submit" disabled={saving}>
                {saving ? "Αποθήκευση..." : "Αποθήκευση"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
