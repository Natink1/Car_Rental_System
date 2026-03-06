import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [role, setRole] = useState('customer');
  const [idImage, setIdImage] = useState(null);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }
    if (role === 'owner' && !idImage) {
      setError('Please upload an ID image to register as owner.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone is required.');
      return;
    }
    try {
      await register(name, email, password, passwordConfirmation, role, role === 'owner' ? idImage : null, phone);
      navigate(role === 'admin' ? '/admin/dashboard' : role === 'owner' ? '/owner/dashboard' : '/customer/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : err.response?.data?.message || 'Registration failed.';
      setError(msg);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Register</h1>
        {error && <p className="error-msg">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +1234567890" required />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={(e) => { setRole(e.target.value); setIdImage(null); }}>
              <option value="customer">Customer</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          {role === 'owner' && (
            <div className="form-group">
              <label>ID image (required for owners)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={(e) => setIdImage(e.target.files?.[0] ?? null)}
                required={role === 'owner'}
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Upload a photo of your ID (e.g. passport or national ID). Max 2MB, JPG or PNG.</p>
            </div>
          )}
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            Register
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
