"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  MODULES,
  PLANS,
  ROLES,
  STATUSES,
  userService,
  type AdminUser,
  type ModuleId,
  type Plan,
  type Role,
  type Status,
  type UserInput,
} from "./user_service";
import "./admin_page.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TRADER_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{3,31}$/;

type FormErrors = {
  name: string;
  traderId: string;
  email: string;
};

const EMPTY_FORM: UserInput = {
  name: "",
  traderId: "",
  email: "",
  role: "trader",
  plan: "free",
  status: "active",
  modules: ["charting"],
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function validateForm(form: UserInput, users: AdminUser[], editingId?: string): FormErrors {
  const errors: FormErrors = { name: "", traderId: "", email: "" };
  const name = form.name.trim();
  const traderId = form.traderId.trim();
  const email = form.email.trim().toLowerCase();

  if (!name) errors.name = "Enter a full name.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";

  if (!traderId) errors.traderId = "Enter a trader ID.";
  else if (!TRADER_ID_PATTERN.test(traderId)) {
    errors.traderId = "Trader ID must be 4–32 characters and start with a letter.";
  } else if (
    users.some(
      (user) =>
        user.id !== editingId && user.traderId.toLowerCase() === traderId.toLowerCase()
    )
  ) {
    errors.traderId = "This trader ID is already in use.";
  }

  if (!email) errors.email = "Enter an email address.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
  else if (
    users.some((user) => user.id !== editingId && user.email.toLowerCase() === email)
  ) {
    errors.email = "This email is already in use.";
  }

  return errors;
}

function Logo() {
  return (
    <div className="admin-logo">
      <span className="admin-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#f0b429" />
          <path
            d="M7 22V18.5M11.5 22V14M16 22V11M20.5 22V15.5M25 22V9"
            stroke="#111"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="admin-logo-text">TradeFoot</span>
      <span className="admin-logo-badge">Admin</span>
    </div>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [planFilter, setPlanFilter] = useState<"all" | Plan>("all");
  const [form, setForm] = useState<UserInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({
    name: "",
    traderId: "",
    email: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    userService.list().then(setUsers);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isEditorOpen && !deleteId) return;

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || isSaving) return;
      setIsEditorOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setErrors({ name: "", traderId: "", email: "" });
      setDeleteId(null);
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isEditorOpen, deleteId, isSaving]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.traderId.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      const matchesPlan = planFilter === "all" || user.plan === planFilter;
      return matchesQuery && matchesStatus && matchesPlan;
    });
  }, [users, query, statusFilter, planFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "active").length,
      suspended: users.filter((user) => user.status === "suspended").length,
      premium: users.filter((user) => user.plan === "premium").length,
    }),
    [users]
  );

  const deleteUser = users.find((user) => user.id === deleteId) ?? null;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({ name: "", traderId: "", email: "" });
    setIsEditorOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      traderId: user.traderId,
      email: user.email,
      role: user.role,
      plan: user.plan,
      status: user.status,
      modules: [...user.modules],
    });
    setErrors({ name: "", traderId: "", email: "" });
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({ name: "", traderId: "", email: "" });
  }

  function updateField<K extends keyof UserInput>(key: K, value: UserInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "name" || key === "traderId" || key === "email") {
      setErrors((current) => ({ ...current, [key]: "" }));
    }
  }

  function toggleModule(moduleId: ModuleId) {
    setForm((current) => {
      const hasModule = current.modules.includes(moduleId);
      return {
        ...current,
        modules: hasModule
          ? current.modules.filter((id) => id !== moduleId)
          : [...current.modules, moduleId],
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm(form, users, editingId ?? undefined);
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.traderId || nextErrors.email) return;

    const payload: UserInput = {
      name: form.name.trim(),
      traderId: form.traderId.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      plan: form.plan,
      status: form.status,
      modules: form.modules,
    };

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await userService.update(editingId, payload);
        setUsers((current) =>
          current.map((user) => (user.id === editingId ? updated : user))
        );
        setToast("User updated.");
      } else {
        const created = await userService.create(payload);
        setUsers((current) => [created, ...current]);
        setToast("User created.");
      }
      closeEditor();
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setIsSaving(true);
    try {
      await userService.remove(deleteId);
      setUsers((current) => current.filter((user) => user.id !== deleteId));
      if (editingId === deleteId) closeEditor();
      setDeleteId(null);
      setToast("User deleted.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Logo />
        <div className="admin-header-meta">
          <span className="admin-header-label">Users & module access</span>
          <span className="admin-avatar" aria-hidden="true">
            A
          </span>
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-hero">
          <div>
            <p className="admin-kicker">INTERNAL CONSOLE</p>
            <h1>User management</h1>
            <p className="admin-lead">
              Create, edit, and remove traders. Assign Charting, Footprint,
              Orderflow, and other TradeFoot modules.
            </p>
          </div>
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            Create user
          </button>
        </section>

        <section className="admin-stats">
          <article className="admin-stat">
            <span>Total users</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="admin-stat">
            <span>Active</span>
            <strong>{stats.active}</strong>
          </article>
          <article className="admin-stat">
            <span>Suspended</span>
            <strong>{stats.suspended}</strong>
          </article>
          <article className="admin-stat">
            <span>Premium</span>
            <strong>{stats.premium}</strong>
          </article>
        </section>

        <section className="admin-card">
          <div className="admin-toolbar">
            <label className="admin-search">
              <span className="sr-only">Search users</span>
              <input
                type="search"
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setQuery(event.target.value)
                }
                placeholder="Search name, email, or trader ID"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | Status)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </select>
            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value as "all" | Plan)}
              aria-label="Filter by plan"
            >
              <option value="all">All plans</option>
              {PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {titleCase(plan)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Trader ID</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Modules</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-empty">
                      No users match these filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-user">
                          <span className="admin-user-avatar">{initials(user.name)}</span>
                          <span>
                            <strong>{user.name}</strong>
                            <small>{user.email}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <code>{user.traderId}</code>
                      </td>
                      <td>{titleCase(user.role)}</td>
                      <td>
                        <span className={`admin-chip admin-chip--${user.plan}`}>
                          {titleCase(user.plan)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-modules">
                          {user.modules.map((moduleId) => (
                            <span key={moduleId} className="admin-module">
                              {MODULES.find((module) => module.id === moduleId)?.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`admin-status admin-status--${user.status}`}>
                          {titleCase(user.status)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            onClick={() => openEdit(user)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--danger"
                            onClick={() => setDeleteId(user.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {toast ? (
        <div className="admin-toast" role="status">
          {toast}
        </div>
      ) : null}

      {isEditorOpen ? (
        <div
          className="admin-overlay"
          role="presentation"
          onClick={() => {
            if (!isSaving) closeEditor();
          }}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-editor-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-head">
              <div>
                <p className="admin-kicker">{editingId ? "UPDATE USER" : "CREATE USER"}</p>
                <h2 id="admin-editor-title">
                  {editingId ? "Update user" : "Create user"}
                </h2>
              </div>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={closeEditor}
                aria-label="Close"
                disabled={isSaving}
              >
                ×
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSubmit} noValidate>
              <label className="admin-field">
                <span>User name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className={errors.name ? "is-invalid" : ""}
                  placeholder="Enter user name"
                />
                {errors.name ? <em>{errors.name}</em> : null}
              </label>

              <label className="admin-field">
                <span>Trade ID</span>
                <input
                  value={form.traderId}
                  onChange={(event) => updateField("traderId", event.target.value)}
                  className={errors.traderId ? "is-invalid" : ""}
                  placeholder="e.g. alex.trader"
                />
                {errors.traderId ? <em>{errors.traderId}</em> : null}
              </label>

              <label className="admin-field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className={errors.email ? "is-invalid" : ""}
                  placeholder="trader@email.com"
                />
                {errors.email ? <em>{errors.email}</em> : null}
              </label>

              <label className="admin-field">
                <span>Role</span>
                <select
                  value={form.role}
                  onChange={(event) => updateField("role", event.target.value as Role)}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {titleCase(role)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Plan</span>
                <select
                  value={form.plan}
                  onChange={(event) => updateField("plan", event.target.value as Plan)}
                >
                  {PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {titleCase(plan)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value as Status)}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {titleCase(status)}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="admin-field admin-field--full">
                <legend>Module access</legend>
                <div className="admin-module-grid">
                  {MODULES.map((module) => (
                    <label key={module.id} className="admin-check">
                      <input
                        type="checkbox"
                        checked={form.modules.includes(module.id)}
                        onChange={() => toggleModule(module.id)}
                      />
                      <span>{module.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={closeEditor}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={isSaving}>
                  {isSaving
                    ? "Saving..."
                    : editingId
                      ? "Update user"
                      : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteUser ? (
        <div className="admin-overlay" role="presentation" onClick={() => setDeleteId(null)}>
          <div
            className="admin-modal admin-modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="admin-kicker">DELETE USER</p>
            <h2 id="admin-delete-title">Remove {deleteUser.name}?</h2>
            <p className="admin-lead">
              This removes {deleteUser.email} and their module access from the
              admin list.
            </p>
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={confirmDelete}
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Delete user"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
