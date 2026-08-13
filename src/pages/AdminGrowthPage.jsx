// src/pages/AdminGrowthPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGrowthMetrics } from "../api/growthApi";
import { ApiRequestError } from "../api/apiClient";

function formatRatio(value) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return `${Math.round(value * 1000) / 10}%`;
}

function FunnelTable({ title, metrics }) {
  if (!metrics) {
    return null;
  }

  const funnel = Array.isArray(metrics.funnel) ? metrics.funnel : [];

  return (
    <section className="panel admin-growth-panel">
      <h2>{title}</h2>
      {funnel.length ? (
        <table className="admin-growth-table">
          <thead>
            <tr>
              <th scope="col">Step</th>
              <th scope="col">Count</th>
              <th scope="col">From previous</th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((step) => (
              <tr key={step.id}>
                <td>{step.label}</td>
                <td>{step.count ?? 0}</td>
                <td>{formatRatio(step.stepConversion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="admin-growth-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Landing page viewed</td>
              <td>{metrics.visitors ?? 0}</td>
            </tr>
            <tr>
              <td>Demo started</td>
              <td>{metrics.demoStarts ?? 0}</td>
            </tr>
            <tr>
              <td>Demo completed</td>
              <td>{metrics.demoCompleted ?? metrics.demoActivitiesGenerated ?? 0}</td>
            </tr>
            <tr>
              <td>Signup started</td>
              <td>{metrics.signupStarted ?? 0}</td>
            </tr>
            <tr>
              <td>Signup completed</td>
              <td>{metrics.accountsCreated ?? 0}</td>
            </tr>
            <tr>
              <td>First activity generated</td>
              <td>{metrics.firstActivityGenerated ?? 0}</td>
            </tr>
            <tr>
              <td>Subscription checkout started</td>
              <td>{metrics.checkoutStarted ?? 0}</td>
            </tr>
            <tr>
              <td>Subscription purchased</td>
              <td>{metrics.paidSubscribers ?? 0}</td>
            </tr>
          </tbody>
        </table>
      )}
      <ul className="admin-growth-conversions">
        <li>
          Landing → demo: {formatRatio(metrics.conversions?.demoConversion)}
        </li>
        <li>
          Demo → signup: {formatRatio(metrics.conversions?.signupConversion)}
        </li>
        <li>
          Signup → first activity:{" "}
          {formatRatio(metrics.conversions?.firstActivityConversion)}
        </li>
        <li>
          Signup → paid: {formatRatio(metrics.conversions?.paidConversion)}
        </li>
        <li>Returning users: {metrics.returningUsers ?? 0}</li>
      </ul>
    </section>
  );
}

export default function AdminGrowthPage() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const next = await getGrowthMetrics({ range });
        if (!cancelled) {
          setData(next);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          if (err instanceof ApiRequestError && err.status === 403) {
            setError("Admin access required to view growth metrics.");
          } else {
            setError(
              err instanceof Error
                ? err.message
                : "Could not load growth metrics."
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="page admin-growth-page">
      <header className="page-header">
        <p className="eyebrow">
          <Link to="/settings">Settings</Link> / Growth
        </p>
        <h1>Growth funnel</h1>
        <p className="lede">
          Ad conversion path: landing → demo → signup → first activity →
          checkout → purchase — with UTM source breakdown.
        </p>
      </header>

      <div className="admin-growth-controls">
        <label htmlFor="growth-range">Range</label>
        <select
          id="growth-range"
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          <option value="1d">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <Link to="/admin/feedback">User feedback</Link>
      </div>

      {loading ? (
        <section className="panel loading-panel">
          <h2>Loading…</h2>
        </section>
      ) : null}

      {error ? (
        <section className="panel status-panel error" role="alert">
          <p>{error}</p>
        </section>
      ) : null}

      {!loading && !error && data ? (
        <>
          <FunnelTable title="Selected range" metrics={data.metrics} />
          <FunnelTable title="Yesterday (UTC)" metrics={data.yesterday} />

          <section className="panel admin-growth-panel">
            <h2>Where visitors came from</h2>
            {data.bySource?.length ? (
              <table className="admin-growth-table">
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Campaign</th>
                    <th scope="col">Landing</th>
                    <th scope="col">Demo</th>
                    <th scope="col">Demo done</th>
                    <th scope="col">Signup</th>
                    <th scope="col">First activity</th>
                    <th scope="col">Checkout</th>
                    <th scope="col">Purchased</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySource.map((row) => (
                    <tr key={`${row.utm_source}-${row.utm_campaign}`}>
                      <td>{row.utm_source}</td>
                      <td>{row.utm_campaign}</td>
                      <td>{row.landingPageViewed ?? row.visitors ?? 0}</td>
                      <td>{row.demoStarted ?? row.demoStarts ?? 0}</td>
                      <td>{row.demoCompleted ?? 0}</td>
                      <td>{row.signupCompleted ?? row.accountsCreated ?? 0}</td>
                      <td>{row.firstActivityGenerated ?? 0}</td>
                      <td>{row.checkoutStarted ?? 0}</td>
                      <td>
                        {row.subscriptionPurchased ?? row.paidSubscribers ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No attributed traffic in this range yet.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
