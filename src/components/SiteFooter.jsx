import { Link } from "react-router-dom";
import { BRAND } from "../config/brand.js";
import { LEGAL_NAV } from "../config/legal.js";

export default function SiteFooter() {
  return (
    <footer className="landing-footer">
      <nav className="landing-footer-inner" aria-label="Legal and contact">
        <img src="/logo.svg" alt="" width="24" height="24" />
        <span>{BRAND.name}</span>
        <span className="landing-footer-sep" aria-hidden="true">
          ·
        </span>
        {LEGAL_NAV.map((item) => (
          <Link key={item.to} to={item.to}>
            {item.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
