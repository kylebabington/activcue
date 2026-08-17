// src/pages/AdminFeedbackPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  listUserFeedback,
  updateUserFeedbackStatus,
} from "../api/feedbackApi";

function categoryLabel(value) {
  return FEEDBACK_CATEGORIES.find((item) => item.value === value)?.label || value;
}

function statusLabel(value) {
  return FEEDBACK_STATUSES.find((item) => item.value === value)?.label || value;
}

export default function AdminFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const next = await listUserFeedback({
          status: statusFilter === "all" ? undefined : statusFilter,
        });
        if (!cancelled) {
          setRows(next);
        }
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(
            err instanceof Error ? err.message : "Could not load feedback."
          );
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
  }, [statusFilter]);

  async function handleStatusChange(id, status) {
    setUpdatingId(id);
    setError("");
    try {
      await updateUserFeedbackStatus(id, status);
      setRows((current) =>
        current
          .map((row) => (row.id === id ? { ...row, status } : row))
          .filter((row) => statusFilter === "all" || row.status === statusFilter)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update feedback status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="page admin-feedback-page">
      <header className="page-header">
        <p className="eyebrow">
          <Link to="/settings">Settings</Link> / Feedback
        </p>
        <h1>User feedback</h1>
        <p className="lede">
          In-app notes from families — separate from support email.
        </p>
      </header>

      <div className="admin-feedback-toolbar">
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All</option>
            {FEEDBACK_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <Link to="/admin/growth">Growth funnel</Link>
        <Link to="/admin/ai-usage">AI spend</Link>
      </div>

      {loading ? <p>Loading feedback…</p> : null}
      {error ? (
        <p className="status-message status-message--error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p>No feedback in this filter yet.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="admin-feedback-list">
          {rows.map((row) => (
            <article key={row.id} className="panel admin-feedback-card">
              <header className="admin-feedback-card-header">
                <p>
                  <strong>{categoryLabel(row.category)}</strong>
                  {" · "}
                  {statusLabel(row.status)}
                </p>
                <p className="admin-feedback-meta">
                  {new Date(row.created_at).toLocaleString()}
                  {row.page ? ` · ${row.page}` : ""}
                </p>
              </header>
              <p className="admin-feedback-message">{row.message}</p>
              <label className="admin-feedback-status">
                Update status
                <select
                  value={row.status}
                  disabled={updatingId === row.id}
                  onChange={(event) =>
                    handleStatusChange(row.id, event.target.value)
                  }
                >
                  {FEEDBACK_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
