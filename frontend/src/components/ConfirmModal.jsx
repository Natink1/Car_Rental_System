export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}) {
  if (!open) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (_) {
      // Leave modal open on error so the caller can show a message
    }
  };

  const confirmClass = variant === 'danger'
    ? 'btn btn-secondary'
    : 'btn btn-primary';
  const confirmStyle = variant === 'danger'
    ? { color: '#dc2626', borderColor: '#dc2626' }
    : {};

  return (
    <div
      className="confirm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="confirm-modal-card">
        <h2 id="confirm-modal-title" className="confirm-modal-title">{title}</h2>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            style={confirmStyle}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        .confirm-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .confirm-modal-card {
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          padding: 1.5rem;
          max-width: 400px;
          width: 100%;
        }
        .confirm-modal-title {
          margin: 0 0 0.75rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text);
        }
        .confirm-modal-message {
          margin: 0 0 1.5rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .confirm-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
      `}</style>
    </div>
  );
}
