import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function DashboardNav({ sections = [], dashboardPath = '' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(sections[0]?.id || '');

  // Update active based on route changes for route-based sections
  useEffect(() => {
    if (!sections || sections.length === 0) return;
    const routeMatch = sections.find((s) => s.to && location.pathname.startsWith(s.to));
    if (routeMatch) {
      setActive(routeMatch.id);
      return;
    }

    // No route match: prefer the first anchor section (non-route) so
    // navigating back to the dashboard picks a sensible anchor.
    const firstAnchor = sections.find((s) => !s.to && s.id);
    if (firstAnchor) {
      setActive(firstAnchor.id);
    } else if (!sections.some((s) => s.id === active)) {
      setActive(sections[0]?.id || '');
    }
  }, [location.pathname, sections]);

  // Scroll spy only for anchor sections (no `to`)
  useEffect(() => {
    const anchorSections = sections.filter((s) => !s.to && s.id);
    if (anchorSections.length === 0) return undefined;

    const onScroll = () => {
      // if a route-based item matches current path, skip anchor spy
      const hasRouteMatch = sections.some((s) => s.to && location.pathname.startsWith(s.to));
      if (hasRouteMatch) return;

      let current = active;
      for (const s of anchorSections) {
        const el = document.getElementById(s.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom > 120) { current = s.id; break; }
        }
      }
      setActive(current);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections, location.pathname]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(id);
      return;
    }

    // If the anchor doesn't exist on the current page, navigate to the
    // provided dashboard path and include the hash so the dashboard can scroll.
    if (dashboardPath) {
      const target = `${dashboardPath}#${id}`;
      navigate(target);
      // try scrolling again shortly after navigation and then set active
      setTimeout(() => {
        const el2 = document.getElementById(id);
        if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(id);
      }, 300);
      return;
    }

    setActive(id);
  };

  return (
    <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
      <nav>
        {sections.map((s) => (
          s.to ? (
            <Link
              key={s.id}
              to={s.to}
              className={active === s.id ? 'active' : ''}
            >
              {s.label}
              {typeof s.badge === 'number' && s.badge > 0 && (
                <span className="dashboard-nav-badge">{s.badge > 99 ? '99+' : s.badge}</span>
              )}
            </Link>
          ) : (
            <button
              key={s.id}
              type="button"
              className={active === s.id ? 'active' : ''}
              onClick={() => scrollTo(s.id)}
            >
              {s.label}
              {typeof s.badge === 'number' && s.badge > 0 && (
                <span className="dashboard-nav-badge">{s.badge > 99 ? '99+' : s.badge}</span>
              )}
            </button>
          )
        ))}
      </nav>
    </aside>
  );
}
