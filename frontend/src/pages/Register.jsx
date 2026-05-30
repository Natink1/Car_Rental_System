import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s.'-]{1,254}$/;
const PASSWORD_HAS_LETTER = /[A-Za-z]/;
const PASSWORD_HAS_NUMBER = /\d/;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

function validateRegisterForm(values) {
  const nextErrors = {};
  const trimmedName = values.name.trim();
  const trimmedEmail = values.email.trim();
  const normalizedPhone = values.phone.trim();

  if (!trimmedName) {
    nextErrors.name = "Name is required.";
  } else if (trimmedName.length < 2) {
    nextErrors.name = "Name must be at least 2 characters.";
  } else if (trimmedName.length > 255) {
    nextErrors.name = "Name must be 255 characters or fewer.";
  } else if (!NAME_REGEX.test(trimmedName)) {
    nextErrors.name = "Name can only contain letters, numbers, spaces, apostrophes, periods, and hyphens.";
  }

  if (!trimmedEmail) {
    nextErrors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    nextErrors.email = "Enter a valid email address.";
  }

  if (!normalizedPhone) {
    nextErrors.phone = "Phone is required.";
  } else {
    const digits = normalizedPhone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      nextErrors.phone = "Phone number must contain 7 to 15 digits.";
    }
  }

  if (!values.password) {
    nextErrors.password = "Password is required.";
  } else if (values.password.length < 8) {
    nextErrors.password = "Password must be at least 8 characters.";
  } else if (!PASSWORD_HAS_LETTER.test(values.password) || !PASSWORD_HAS_NUMBER.test(values.password)) {
    nextErrors.password = "Password must include at least one letter and one number.";
  }

  if (!values.passwordConfirmation) {
    nextErrors.passwordConfirmation = "Please confirm your password.";
  } else if (values.password !== values.passwordConfirmation) {
    nextErrors.passwordConfirmation = "Passwords do not match.";
  }

  if (values.role === "owner") {
    if (!values.idImage) {
      nextErrors.idImage = "ID image is required for owner accounts.";
    } else if (!["image/jpeg", "image/png"].includes(values.idImage.type)) {
      nextErrors.idImage = "Only JPG and PNG images are allowed.";
    } else if (values.idImage.size > MAX_IMAGE_SIZE) {
      nextErrors.idImage = "ID image must be 2MB or smaller.";
    }
  }

  return nextErrors;
}

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState("customer");
  const [idImage, setIdImage] = useState(null);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const values = { name, email, phone, password, passwordConfirmation, role, idImage };

  const setFieldError = (field, message) => {
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      if (message) {
        nextErrors[field] = message;
      } else {
        delete nextErrors[field];
      }
      return nextErrors;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateRegisterForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    try {
      await register(
        name,
        email,
        password,
        passwordConfirmation,
        role,
        role === "owner" ? idImage : null,
        phone,
      );
      toast.success("Registration successful.");
      navigate(
        role === "admin"
          ? "/admin/dashboard"
          : role === "owner"
            ? "/owner/dashboard"
            : "/customer/dashboard",
        { replace: true },
      );
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : err.response?.data?.message || "Registration failed.";
      toast.error(msg);
    }
  };

  const renderError = (field) =>
    errors[field] ? (
      <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: "0.35rem 0 0" }}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <div
      className="container"
      style={{ maxWidth: "400px", margin: "2rem auto" }}
    >
      <div className="card" style={{ padding: "2rem" }}>
        <h1 style={{ marginBottom: "1.5rem" }}>Register</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
                setFieldError(
                  "name",
                  validateRegisterForm({ ...values, name: value }).name,
                );
              }}
              required
              maxLength={255}
            />
            {renderError("name")}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                const value = e.target.value;
                setEmail(value);
                setFieldError(
                  "email",
                  validateRegisterForm({ ...values, email: value }).email,
                );
              }}
              required
            />
            {renderError("email")}
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const value = e.target.value;
                setPhone(value);
                setFieldError(
                  "phone",
                  validateRegisterForm({ ...values, phone: value }).phone,
                );
              }}
              placeholder="e.g. +1234567890"
              required
            />
            {renderError("phone")}
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              value={role}
              onChange={(e) => {
                const value = e.target.value;
                setRole(value);
                setIdImage(null);
                setFieldError(
                  "idImage",
                  validateRegisterForm({ ...values, role: value, idImage: null }).idImage,
                );
              }}
            >
              <option value="customer">Customer</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          {role === "owner" && (
            <div className="form-group">
              <label>ID image (required for owners)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setIdImage(file);
                  setFieldError(
                    "idImage",
                    validateRegisterForm({ ...values, idImage: file }).idImage,
                  );
                }}
                required={role === "owner"}
              />
              {renderError("idImage")}
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                  marginTop: "0.25rem",
                }}
              >
                Upload a photo of your ID (e.g. passport or national ID). Max
                2MB, JPG or PNG.
              </p>
            </div>
          )}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                const value = e.target.value;
                setPassword(value);
                const nextValidation = validateRegisterForm({
                  ...values,
                  password: value,
                });
                setFieldError("password", nextValidation.password);
                setFieldError("passwordConfirmation", nextValidation.passwordConfirmation);
              }}
              required
              minLength={8}
            />
            {renderError("password")}
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => {
                const value = e.target.value;
                setPasswordConfirmation(value);
                setFieldError(
                  "passwordConfirmation",
                  validateRegisterForm({ ...values, passwordConfirmation: value }).passwordConfirmation,
                );
              }}
              required
            />
            {renderError("passwordConfirmation")}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            Register
          </button>
        </form>
        <p style={{ marginTop: "1rem", textAlign: "center" }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
