import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as carsApi from "../api/cars";

export function AddCar() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    transmission: "automatic",
    fuel_type: "petrol",
    seats: 5,
    price_per_day: "",
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    if (images.length === 0) {
      setImagePreviews([]);
      return;
    }
    const urls = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "year" || name === "seats" ? Number(value) : value,
    }));
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setImages((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) {
      toast.error("At least one image is required.");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== "") fd.append(k, v);
    });
    images.forEach((file) => fd.append("images[]", file));
    try {
      await carsApi.createCar(fd);
      toast.success("Car added successfully.");
      navigate("/owner/dashboard");
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.entries(err.response.data.errors)
            .flatMap(([, v]) => v)
            .join(" ")
        : err.response?.data?.message || "Failed to add car.";
      toast.error(msg);
    }
  };

  return (
    <div className="container" style={{ maxWidth: "560px", margin: "0 auto" }}>
      <h1 className="section-title">Add car</h1>
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
            <label>Images * (at least one, jpg/png, max 2MB each)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              multiple
              onChange={handleImagesChange}
              required={images.length === 0}
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
            {imagePreviews.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginTop: "0.5rem",
                }}
              >
                {imagePreviews.map((url, i) => (
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
                      onClick={() => removeImage(i)}
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
            {images.length > 0 && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                  marginTop: "0.25rem",
                }}
              >
                {images.length} file(s) selected
              </p>
            )}
          </div>
          <button type="submit" className="btn btn-primary">
            Add car
          </button>
        </form>
      </div>
    </div>
  );
}
