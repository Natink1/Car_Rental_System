import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import * as adminApi from "../../api/admin";
import { getImageUrl } from "../../utils/imageUrl";
import { useAuth } from "../../contexts/AuthContext";

const NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s.'-]{1,254}$/;

function validateEditUserForm(values) {
  const nextErrors = {};
  const trimmedName = values.name.trim();
  const trimmedPhone = values.phone.trim();

  if (!trimmedName) {
    nextErrors.name = "Name is required.";
  } else if (trimmedName.length < 2) {
    nextErrors.name = "Name must be at least 2 characters.";
  } else if (trimmedName.length > 255) {
    nextErrors.name = "Name must be 255 characters or fewer.";
  } else if (!NAME_REGEX.test(trimmedName)) {
    nextErrors.name = "Name can only contain letters, numbers, spaces, apostrophes, periods, and hyphens.";
  }

  if (values.role !== "admin") {
    if (!trimmedPhone) {
      nextErrors.phone = "Phone is required.";
    } else {
      const digits = trimmedPhone.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        nextErrors.phone = "Phone number must contain 7 to 15 digits.";
      }
    }
  } else if (trimmedPhone) {
    const digits = trimmedPhone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      nextErrors.phone = "Phone number must contain 7 to 15 digits.";
    }
  }

  return nextErrors;
}

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    role: "customer",
  });
  const [idImage, setIdImage] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [viewIdImageUser, setViewIdImageUser] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [resetForm, setResetForm] = useState({
    password: "",
    password_confirmation: "",
  });
  const [resetLoading, setResetLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
  });
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const fetchUsers = () => {
    return adminApi
      .getUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (createForm.password !== createForm.password_confirmation) {
      toast.error("Passwords do not match.");
      return;
    }
    if (createForm.role === "owner" && !idImage) {
      toast.error("ID image is required for owner accounts.");
      return;
    }
    if (createForm.role !== "admin" && !createForm.phone?.trim()) {
      toast.error("Phone is required for customer and owner accounts.");
      return;
    }
    setCreateLoading(true);
    try {
      if (idImage && createForm.role === "owner") {
        const formData = new FormData();
        formData.append("name", createForm.name);
        formData.append("email", createForm.email);
        formData.append("password", createForm.password);
        formData.append(
          "password_confirmation",
          createForm.password_confirmation,
        );
        formData.append("role", createForm.role);
        formData.append("id_image", idImage);
        if (createForm.role !== "admin")
          formData.append("phone", createForm.phone || "");
        await adminApi.createUser(formData);
      } else {
        const payload = { ...createForm, role: createForm.role };
        if (createForm.role === "admin") delete payload.phone;
        else payload.phone = payload.phone || "";
        await adminApi.createUser(payload);
      }
      setShowCreate(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        password_confirmation: "",
        role: "customer",
      });
      setIdImage(null);
      toast.success("User created successfully.");
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : err.response?.data?.message || "Failed to create user.";
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const openResetPassword = (targetUser) => {
    setResetUser(targetUser);
    setResetForm({ password: "", password_confirmation: "" });
  };

  const openEditUser = (targetUser) => {
    setEditUser(targetUser);
    setEditForm({
      name: targetUser.name || "",
      phone: targetUser.role === "admin" ? "" : targetUser.phone || "",
    });
    setEditErrors({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;

    const nextErrors = validateEditUserForm({
      ...editForm,
      role: editUser.role,
    });
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setEditLoading(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        phone: editUser.role === "admin" ? null : editForm.phone.trim(),
      };
      const data = await adminApi.updateUser(editUser.id, payload);
      const updatedUser = data.user || data;
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );
      if (currentUser?.id === updatedUser.id) {
        window.dispatchEvent(new CustomEvent("auth-user-updated", { detail: updatedUser }));
      }
      setEditUser(null);
      setEditForm({ name: "", phone: "" });
      setEditErrors({});
      toast.success("User updated successfully.");
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : err.response?.data?.message || "Failed to update user.";
      toast.error(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetUser) return;
    if (resetForm.password !== resetForm.password_confirmation) {
      toast.error("Passwords do not match.");
      return;
    }

    setResetLoading(true);
    try {
      await adminApi.resetUserPassword(resetUser.id, resetForm);
      toast.success(`Password reset for ${resetUser.name}.`);
      setResetUser(null);
      setResetForm({ password: "", password_confirmation: "" });
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : err.response?.data?.message || "Failed to reset password.";
      toast.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="section-title">Users</h1>
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <Link to="/admin/dashboard" className="btn btn-secondary">
          Back to dashboard
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setShowCreate(true);
            setCreateForm({
              name: "",
              email: "",
              phone: "",
              password: "",
              password_confirmation: "",
              role: "customer",
            });
            setIdImage(null);
          }}
        >
          Create user
        </button>
      </div>

      {showCreate && (
        <div
          className="card"
          style={{ padding: "1.5rem", marginBottom: "2rem" }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
            Create user
          </h2>
          <form onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={createForm.role}
                onChange={(e) => {
                  setCreateForm((f) => ({ ...f, role: e.target.value }));
                  setIdImage(null);
                }}
              >
                <option value="customer">Customer</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {createForm.role !== "admin" && (
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="e.g. +1234567890"
                  required
                />
              </div>
            )}
            {createForm.role === "owner" && (
              <div className="form-group">
                <label>ID image (required for owners)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={(e) => setIdImage(e.target.files?.[0] ?? null)}
                  required={createForm.role === "owner"}
                />
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  JPG or PNG, max 2MB.
                </p>
              </div>
            )}
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
                required
                minLength={8}
              />
            </div>
            <div className="form-group">
              <label>Confirm password</label>
              <input
                type="password"
                value={createForm.password_confirmation}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    password_confirmation: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createLoading}
              >
                {createLoading ? "Creating…" : "Create user"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div className="spinner" />
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid var(--border)",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "0.75rem" }}>Name</th>
                <th style={{ padding: "0.75rem" }}>Email</th>
                <th style={{ padding: "0.75rem" }}>Phone</th>
                <th style={{ padding: "0.75rem" }}>Role</th>
                <th style={{ padding: "0.75rem" }}>ID image (owners)</th>
                <th style={{ padding: "0.75rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: "1.5rem", color: "var(--text-muted)" }}
                  >
                    No users.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "0.75rem" }}>{u.name}</td>
                  <td style={{ padding: "0.75rem" }}>{u.email}</td>
                  <td style={{ padding: "0.75rem" }}>
                    {u.role !== "admin" ? u.phone || "—" : "—"}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <span
                      className={`badge ${u.role === "admin" ? "badge-approved" : u.role === "owner" ? "badge-pending" : ""}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {u.role === "owner" ? (
                      u.id_image_url ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            fontSize: "0.875rem",
                            padding: "0.35rem 0.75rem",
                          }}
                          onClick={() => setViewIdImageUser(u)}
                        >
                          View ID image
                        </button>
                      ) : (
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.875rem",
                          }}
                        >
                          —
                        </span>
                      )
                    ) : (
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.875rem",
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          fontSize: "0.875rem",
                          padding: "0.35rem 0.75rem",
                        }}
                        onClick={() => setDetailUser(u)}
                      >
                        View details
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          fontSize: "0.875rem",
                          padding: "0.35rem 0.75rem",
                        }}
                        onClick={() => openEditUser(u)}
                      >
                        Edit user
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            fontSize: "0.875rem",
                            padding: "0.35rem 0.75rem",
                          }}
                          onClick={() => openResetPassword(u)}
                        >
                          Reset password
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewIdImageUser && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={(e) =>
            e.target === e.currentTarget && setViewIdImageUser(null)
          }
        >
          <div
            className="card"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "auto",
              padding: "1rem",
            }}
          >
            <h3 style={{ marginBottom: "0.5rem" }}>
              ID image — {viewIdImageUser.name}
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-muted)",
                marginBottom: "1rem",
              }}
            >
              {viewIdImageUser.email}
            </p>
            <img
              src={getImageUrl(viewIdImageUser.id_image_url)}
              alt="Owner ID"
              style={{
                maxWidth: "100%",
                height: "auto",
                display: "block",
                borderRadius: "var(--radius)",
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: "1rem" }}
              onClick={() => setViewIdImageUser(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {detailUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-detail-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
            padding: "1rem",
          }}
          onClick={(e) => e.target === e.currentTarget && setDetailUser(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: "420px",
              width: "100%",
              overflow: "auto",
              padding: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="user-detail-modal-title"
              style={{ marginBottom: "1rem", fontSize: "1.25rem" }}
            >
              User details
            </h3>
            <dl style={{ margin: 0, display: "grid", gap: "0.75rem" }}>
              <div>
                <dt
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                  }}
                >
                  Name
                </dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>
                  {detailUser.name}
                </dd>
              </div>
              <div>
                <dt
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                  }}
                >
                  Email
                </dt>
                <dd style={{ margin: 0 }}>{detailUser.email}</dd>
              </div>
              {detailUser.role !== "admin" && (
                <div>
                  <dt
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginBottom: "0.25rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Phone
                  </dt>
                  <dd style={{ margin: 0 }}>{detailUser.phone || "—"}</dd>
                </div>
              )}
              <div>
                <dt
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                  }}
                >
                  Role
                </dt>
                <dd style={{ margin: 0 }}>
                  <span
                    className={`badge ${detailUser.role === "admin" ? "badge-approved" : detailUser.role === "owner" ? "badge-pending" : ""}`}
                  >
                    {detailUser.role}
                  </span>
                </dd>
              </div>
              {detailUser.role === "owner" && detailUser.id_image_url && (
                <div>
                  <dt
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginBottom: "0.25rem",
                      textTransform: "uppercase",
                    }}
                  >
                    ID image
                  </dt>
                  <dd style={{ margin: 0 }}>
                    <img
                      src={getImageUrl(detailUser.id_image_url)}
                      alt="Owner ID"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        display: "block",
                        borderRadius: "var(--radius)",
                        marginTop: "0.25rem",
                      }}
                    />
                  </dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: "1.25rem" }}
              onClick={() => setDetailUser(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {editUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1002,
            padding: "1rem",
          }}
          onClick={(e) => e.target === e.currentTarget && setEditUser(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: "460px",
              width: "100%",
              overflow: "auto",
              padding: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="edit-user-modal-title"
              style={{ marginBottom: "0.35rem", fontSize: "1.25rem" }}
            >
              Edit user
            </h3>
            <p style={{ margin: "0 0 1rem", color: "var(--text-muted)" }}>
              {editUser.name} · {editUser.email}
            </p>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditForm((form) => ({ ...form, name: value }));
                    setEditErrors((currentErrors) => {
                      const nextErrors = { ...currentErrors };
                      const validation = validateEditUserForm({
                        ...editForm,
                        name: value,
                        role: editUser.role,
                      });
                      if (validation.name) {
                        nextErrors.name = validation.name;
                      } else {
                        delete nextErrors.name;
                      }
                      return nextErrors;
                    });
                  }}
                  required
                  maxLength={255}
                />
                {editErrors.name && (
                  <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: "0.35rem 0 0" }}>
                    {editErrors.name}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditForm((form) => ({ ...form, phone: value }));
                    setEditErrors((currentErrors) => {
                      const nextErrors = { ...currentErrors };
                      const validation = validateEditUserForm({
                        ...editForm,
                        phone: value,
                        role: editUser.role,
                      });
                      if (validation.phone) {
                        nextErrors.phone = validation.phone;
                      } else {
                        delete nextErrors.phone;
                      }
                      return nextErrors;
                    });
                  }}
                  placeholder="e.g. +1234567890"
                  required={editUser.role !== "admin"}
                />
                {editErrors.phone && (
                  <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: "0.35rem 0 0" }}>
                    {editErrors.phone}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditUser(null)}
                  disabled={editLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1002,
            padding: "1rem",
          }}
          onClick={(e) => e.target === e.currentTarget && setResetUser(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: "420px",
              width: "100%",
              overflow: "auto",
              padding: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="reset-password-modal-title"
              style={{ marginBottom: "0.35rem", fontSize: "1.25rem" }}
            >
              Reset password
            </h3>
            <p style={{ margin: "0 0 1rem", color: "var(--text-muted)" }}>
              {resetUser.name} · {resetUser.email}
            </p>
            <form onSubmit={handleResetPasswordSubmit}>
              <div className="form-group">
                <label>New password</label>
                <input
                  type="password"
                  value={resetForm.password}
                  onChange={(e) => setResetForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label>Confirm new password</label>
                <input
                  type="password"
                  value={resetForm.password_confirmation}
                  onChange={(e) => setResetForm((f) => ({ ...f, password_confirmation: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                  {resetLoading ? "Resetting..." : "Reset password"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetUser(null)}
                  disabled={resetLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
