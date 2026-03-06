import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

export function ChangePasswordModal({ open, onClose }) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (password !== passwordConfirmation) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/auth/password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess(true);
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : err.response?.data?.message || 'Failed to change password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess(false);
    setCurrentPassword('');
    setPassword('');
    setPasswordConfirmation('');
    onClose();
  };

  if (!open) return null;
  if (!user) return null;

  return (
    <div
      className="change-password-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="card change-password-modal-card">
        <h2 id="change-password-title" style={{ marginBottom: '0.5rem' }}>Change password</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {user.email}
        </p>
        {error && <p className="error-msg">{error}</p>}
        {success && <p style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Password updated successfully.</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Confirm new password</label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .change-password-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .change-password-modal-card {
          max-width: 420px;
          width: 100%;
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
}
