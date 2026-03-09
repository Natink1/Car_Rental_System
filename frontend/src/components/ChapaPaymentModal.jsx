/**
 * Chapa payment: redirects user to Chapa checkout. No frontend key needed – secret stays on backend.
 * See https://developer.chapa.co/
 * We only call the API when the user clicks "Continue", so the booking page stays normal when the modal opens.
 */
import { useState, useEffect } from 'react';
import * as paymentsApi from '../api/payments';
import { formatBirr } from '../utils/currency';

export function ChapaPaymentModal({ open, onClose, booking, amount }) {
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setCheckoutUrl(null);
      setError('');
      setLoading(false);
    }
  }, [open]);

  const handleContinueClick = () => {
    if (!booking?.id || loading) return;
    setError('');
    setLoading(true);
    paymentsApi
      .initializeChapa(booking.id)
      .then((data) => {
        if (data?.checkout_url) {
          setCheckoutUrl(data.checkout_url);
          if (data?.tx_ref) {
            localStorage.setItem('pendingChapaTxRef', data.tx_ref);
          }
        }
        else setError('Could not start payment.');
      })
      .catch((err) => {
        const msg = err.response?.status === 401
          ? 'Session expired. Please log in again and try again.'
          : (err.response?.data?.message || err.message || 'Could not start payment.');
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  if (!open) return null;

  return (
    <div className="chapa-modal-backdrop" role="dialog" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card chapa-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="chapa-modal-scroll">
          <h3 style={{ marginBottom: '0.25rem' }}>Pay with Chapa</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Amount: <strong>{formatBirr(amount)}</strong>
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {checkoutUrl
              ? 'Click the button below to open Chapa in a new tab.'
              : 'Chapa will open in a new tab and stay on its receipt page after payment. Then return to this tab to see updates.'}
          </p>
          {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {checkoutUrl ? (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
                onClick={() => onClose()}
              >
                Open Chapa
              </a>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleContinueClick}
                disabled={loading}
              >
                {loading ? 'Preparing…' : 'Continue to Chapa'}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .chapa-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          overflow-y: auto;
        }
        .chapa-modal-card {
          max-width: 420px;
          width: 100%;
          padding: 1.5rem;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          margin: auto;
        }
        .chapa-modal-scroll {
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
        }
      `}</style>
    </div>
  );
}
