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

function MetricTable({ title, metrics }) {
  if (!metrics) {
    return null;
  }

  const rows = [
    ["Visitors", metrics.visitors],
    ["Demo starts", metrics.demoStarts],
    ["Demo activities generated", metrics.demoActivitiesGenerated],
    ["Accounts created", metrics.accountsCreated],
    ["Full activities generated", metrics.activitiesGenerated],
    ["Returning users", metrics.returningUsers],
    ["Checkout started", metrics.checkoutStarted],
    ["Paid subscribers", metrics.paidSubscribers],
  ];

  return (
    <section className="panel admin-growth-panel">
      <h2>{title}</h2>
      <table className="admin-growth-table">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{value ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="admin-growth-conversions">
        <li>
          Demo conversion: {formatRatio(metrics.conversions?.demoConversion)}
        </li>
        <li>
          Signup conversion:{" "}
          {formatRatio(metrics.conversions?.signupConversion)}
        </li>
        <li>
          Paid conversion: {formatRatio(metrics.conversions?.paidConversion)}
        </li>
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
          Visits, demo use, signups, and paid conversions — with UTM source
          breakdown.
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
          <MetricTable title="Selected range" metrics={data.metrics} />
          <MetricTable title="Yesterday (UTC)" metrics={data.yesterday} />

          <section className="panel admin-growth-panel">
            <h2>Where visitors came from</h2>
            {data.bySource?.length ? (
              <table className="admin-growth-table">
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Campaign</th>
                    <th scope="col">Visitors</th>
                    <th scope="col">Demo</th>
                    <th scope="col">Accounts</th>
                    <th scope="col">Checkout</th>
                    <th scope="col">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySource.map((row) => (
                    <tr key={`${row.utm_source}-${row.utm_campaign}`}>
                      <td>{row.utm_source}</td>
                      <td>{row.utm_campaign}</td>
                      <td>{row.visitors}</td>
                      <td>{row.demoStarts}</td>
                      <td>{row.accountsCreated}</td>
                      <td>{row.checkoutStarted}</td>
                      <td>{row.paidSubscribers}</td>
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
