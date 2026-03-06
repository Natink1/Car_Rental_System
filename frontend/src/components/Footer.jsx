import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <strong>NHK Car-Rental</strong>
            <p>Drive your journey with confidence.</p>
          </div>
          <div>
            <strong>Quick links</strong>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/cars">Cars</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </div>
          <div>
            <strong>Contact</strong>
            <p>support@nhk-carrental.test</p>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} NHK Car-Rental. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
