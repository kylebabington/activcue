// src/pages/settings/SettingsSupportSection.jsx

import { Link } from "react-router-dom";

const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || "support@activcue.app";

export default function SettingsSupportSection({ isAdmin = false } = {}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Support</h2>
          <p>
            Questions, billing help, or privacy requests — email us and we will
            get back to you.
          </p>
        </div>
      </div>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
      {isAdmin ? (
        <p>
          <Link to="/admin/growth">Growth funnel dashboard</Link>
        </p>
      ) : null}
      <p className="account-legal-links">
        <Link to="/privacy">Privacy Policy</Link>
        {" · "}
        <Link to="/terms">Terms of Use</Link>
      </p>
    </section>
  );
}
