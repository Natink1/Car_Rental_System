import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as carsApi from "../api/cars";
import { getImageUrl } from "../utils/imageUrl";
import { ConfirmModal } from "../components/ConfirmModal";

export function EditCar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    transmission: "automatic",
    fuel_type: "petrol",
    seats: 5,
    price_per_day: "",
  });
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [removeMediaIds, setRemoveMediaIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (newImages.length === 0) {
      setNewImagePreviews([]);
      return;
    }
    const urls = newImages.map((file) => URL.createObjectURL(file));
    setNewImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newImages]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    carsApi
      .getById(id)
      .then((data) => {
        setCar(data);
        setForm({
          brand: data.brand || "",
          model: data.model || "",
          year: data.year ?? new Date().getFullYear(),
          transmission: data.transmission || "automatic",
          fuel_type: data.fuel_type || "petrol",
          seats: data.seats ?? 5,
          price_per_day: data.price_per_day ?? "",
        });
        setRemoveMediaIds([]);
      })
      .catch(() => setCar(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "year" || name === "seats" ? Number(value) : value,
    }));
  };

  const handleRemoveImage = (mediaId) => {
    setRemoveMediaIds((prev) =>
      prev.includes(mediaId) ? prev : [...prev, mediaId],
    );
  };

  const handleUndoRemove = (mediaId) => {
    setRemoveMediaIds((prev) => prev.filter((id) => id !== mediaId));
  };

  const handleNewImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setNewImages((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteCar = async () => {
    setDeleteLoading(true);
    try {
      await carsApi.deleteCar(id);
      toast.success("Car deleted successfully.");
      navigate("/owner/dashboard");
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.entries(err.response.data.errors)
            .flatMap(([, v]) => v)
            .join(" ")
        : err.response?.data?.message || "Could not delete car.";
      toast.error(msg);
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!car?.can_owner_edit) {
      toast.error(
        "This car cannot be edited while it is rented or has upcoming bookings.",
      );
      return;
    }
    const fd = new FormData();
    fd.append("_method", "PUT");
    Object.entries(form).forEach(([k, v]) => {
      if (v !== "") fd.append(k, v);
    });
    removeMediaIds.forEach((mid) => fd.append("remove_media_ids[]", mid));
    if (newImages.length > 0) {
      fd.append("replace_images", "1");
      newImages.forEach((file) => fd.append("images[]", file));
    }
    try {
      await carsApi.updateCar(id, fd);
      toast.success("Car updated successfully.");
      navigate("/owner/dashboard");
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.entries(err.response.data.errors)
            .flatMap(([, v]) => v)
            .join(" ")
        : err.response?.data?.message || "Failed to update car.";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="container">
        <p>Car not found.</p>
        <Link to="/owner/dashboard" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!car.can_owner_edit) {
    return (
      <div
        className="container"
        style={{ maxWidth: "560px", margin: "0 auto" }}
      >
        <h1 className="section-title">Edit car</h1>
        <div className="card" style={{ padding: "2rem" }}>
          <p className="error-msg">
            This car cannot be edited because it is currently rented or has
            upcoming bookings. Wait until the booking period ends.
          </p>
          <Link
            to={`/cars/${id}`}
            className="btn btn-secondary"
            style={{ marginRight: "0.5rem" }}
          >
            View car
          </Link>
          <Link to="/owner/dashboard" className="btn btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentMedia =
    car.media && car.media.length > 0
      ? car.media
      : car.images?.length
        ? car.images.map((url, i) => ({
            id: `url-${i}`,
            url: getImageUrl(url),
          }))
        : [];

  return (
    <div className="container" style={{ maxWidth: "560px", margin: "0 auto" }}>
      <h1 className="section-title">Edit car</h1>
      <div className="card" style={{ padding: "2rem" }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Brand *</label>
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Model *</label>
            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Year *</label>
            <input
              name="year"
              type="number"
              min="1900"
              max="2100"
              value={form.year}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Transmission *</label>
            <select
              name="transmission"
              value={form.transmission}
              onChange={handleChange}
            >
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div className="form-group">
            <label>Fuel type *</label>
            <select
              name="fuel_type"
              value={form.fuel_type}
              onChange={handleChange}
            >
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="form-group">
            <label>Seats *</label>
            <input
              name="seats"
              type="number"
              min="1"
              max="20"
              value={form.seats}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Price per day ($) *</label>
            <input
              name="price_per_day"
              type="number"
              min="0"
              step="0.01"
              value={form.price_per_day}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Current images (click × to remove)</label>
            {currentMedia.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginTop: "0.25rem",
                }}
              >
                {currentMedia.map((item) => {
                  const id = item.id;
                  const url = item.url || getImageUrl(item);
                  const isRemoved =
                    typeof id === "number" && removeMediaIds.includes(id);
                  if (isRemoved) {
                    return (
                      <div
                        key={id}
                        style={{ position: "relative", width: 80, height: 60 }}
                      >
                        <img
                          src={url}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "var(--radius)",
                            opacity: 0.4,
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: 2,
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Removed
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            position: "absolute",
                            bottom: 2,
                            left: 2,
                            padding: "0.15rem 0.4rem",
                            fontSize: "0.7rem",
                          }}
                          onClick={() => handleUndoRemove(id)}
                        >
                          Undo
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div key={id} style={{ position: "relative" }}>
                      <img
                        src={url}
                        alt=""
                        style={{
                          width: 80,
                          height: 60,
                          objectFit: "cover",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      {typeof id === "number" && (
                        <button
                          type="button"
                          aria-label="Remove image"
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            border: "none",
                            background: "#dc2626",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            lineHeight: 1,
                          }}
                          onClick={() => handleRemoveImage(id)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                No images
              </p>
            )}
          </div>
          <div className="form-group">
            <label>
              Add or replace images (optional, jpg/png, max 2MB each)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              multiple
              onChange={handleNewImagesChange}
            />
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-muted)",
                marginTop: "0.25rem",
              }}
            >
              You can select multiple files; each selection adds to the list.
            </p>
            {newImagePreviews.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginTop: "0.5rem",
                }}
              >
                {newImagePreviews.map((url, i) => (
                  <div key={`${url}-${i}`} style={{ position: "relative" }}>
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: 100,
                        height: 75,
                        objectFit: "cover",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => removeNewImage(i)}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "none",
                        background: "#dc2626",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {newImages.length > 0 && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                  marginTop: "0.25rem",
                }}
              >
                {newImages.length} new file(s) selected — will replace all
                current images on save
              </p>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <button type="submit" className="btn btn-primary">
              Save changes
            </button>
            <Link to="/owner/dashboard" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                marginLeft: "auto",
                color: "#dc2626",
                borderColor: "#dc2626",
              }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete car
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCar}
        title="Delete car"
        message="Delete this car? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
