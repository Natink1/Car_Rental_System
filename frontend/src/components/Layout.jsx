import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Layout({ children }) {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="layout">
      <Navbar />
      <main className={`main${isHomePage ? " main--home" : ""}`}>{children}</main>
      <Footer />
    </div>
  );
}
