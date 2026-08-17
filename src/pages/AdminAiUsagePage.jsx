// src/pages/AdminAiUsagePage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminAiUsage } from "../api/aiUsageApi";
import { ApiRequestError } from "../api/apiClient";

const OPERATION_LABELS = {
  "activity-suggestions": "Activity suggestions",
  "quest-step-hint": "Quest step hints",
};

const FAILURE_TYPE_LABELS = {
  quota: "Quota",
  rate_limit: "Rate limit",
  auth: "Auth",
  timeout: "Timeout",
  invalid_request: "Invalid request",
  server_error: "Server error",
  unknown: "Unknown",
};

function formatUsd(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

function operationLabel(name) {
  return OPERATION_LABELS[name] || name;
}

function failureTypeLabel(name) {
  return FAILURE_TYPE_LABELS[name] || name;
}

export default function AdminAiUsagePage() {
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
        const next = await getAdminAiUsage({ range });
        if (!cancelled) {
          setData(next);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          if (err instanceof ApiRequestError && err.status === 403) {
            setError("Admin access required to view AI spend.");
          } else {
            setError(
              err instanceof Error ? err.message : "Could not load AI spend."
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

  const operations = data?.byOperation
    ? Object.entries(data.byOperation)
    : [];
  const failureTypes = data?.byFailureType
    ? Object.entries(data.byFailureType)
    : [];

  return (
    <div className="page admin-growth-page">
      <header className="page-header">
        <p className="eyebrow">
          <Link to="/settings">Settings</Link> / AI spend
        </p>
        <h1>AI spend</h1>
        <p className="lede">
          Estimated OpenAI cost from ActivCue token logs. Remaining prepaid
          credits and billing alerts live in the OpenAI dashboard.
        </p>
      </header>

      <div className="admin-growth-controls">
        <label htmlFor="ai-usage-range">Range</label>
        <select
          id="ai-usage-range"
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          <option value="1d">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <Link to="/admin/growth">Growth funnel</Link>
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
          <section className="panel admin-growth-panel">
            <h2>Selected range</h2>
            <table className="admin-growth-table">
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Estimated cost</td>
                  <td>{formatUsd(data.estimatedCost)}</td>
                </tr>
                <tr>
                  <td>Successful calls</td>
                  <td>{data.successCount ?? 0}</td>
                </tr>
                <tr>
                  <td>Failed calls</td>
                  <td>{data.failureCount ?? 0}</td>
                </tr>
                <tr>
                  <td>Total calls</td>
                  <td>{data.callCount ?? 0}</td>
                </tr>
              </tbody>
            </table>
            <p className="admin-growth-conversions">
              These are ActivCue estimates from token counts, not OpenAI
              invoices. Set budget alerts at platform.openai.com.
            </p>
          </section>

          <section className="panel admin-growth-panel">
            <h2>By operation</h2>
            <table className="admin-growth-table">
              <thead>
                <tr>
                  <th scope="col">Operation</th>
                  <th scope="col">Success</th>
                  <th scope="col">Failure</th>
                  <th scope="col">Estimated cost</th>
                </tr>
              </thead>
              <tbody>
                {operations.map(([name, counts]) => (
                  <tr key={name}>
                    <td>{operationLabel(name)}</td>
                    <td>{counts.success ?? 0}</td>
                    <td>{counts.failure ?? 0}</td>
                    <td>{formatUsd(counts.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel admin-growth-panel">
            <h2>Failures</h2>
            {failureTypes.length ? (
              <table className="admin-growth-table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {failureTypes.map(([name, count]) => (
                    <tr key={name}>
                      <td>{failureTypeLabel(name)}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No failed OpenAI calls in this range.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
