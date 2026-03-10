/**
 * Displays a 1–5 star rating (e.g. from average_rating).
 * @param {number} rating - Average rating 0–5 (can be decimal)
 * @param {number} [reviewCount] - Optional number of reviews to show e.g. "(12)"
 * @param {object} [style] - Optional extra styles
 */
export function StarRating({ rating = 0, reviewCount, style = {} }) {
  const value = Math.min(5, Math.max(0, Number(rating) || 0));
  const full = Math.round(value); // 0–5 full stars
  const empty = 5 - full;

  return (
    <span className="star-rating" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', ...style }}>
      {Array.from({ length: full }, (_, i) => (
        <span key={`f-${i}`} aria-hidden="true" style={{ color: '#eab308' }}>★</span>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e-${i}`} aria-hidden="true" style={{ color: '#d1d5db' }}>☆</span>
      ))}
      {reviewCount != null && reviewCount > 0 && (
        <span style={{ marginLeft: '0.25rem', color: 'var(--text-muted, #64748b)', fontSize: '0.875rem' }}>
          ({reviewCount})
        </span>
      )}
    </span>
  );
}
