// src/pages/InsightsPage.jsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchFamilyInsights } from "../api/familyInsightsApi";
import { useAppContext } from "../context/AppContext";
import { useEntitlementContext } from "../context/domainContexts";
import { buildFamilyInsights } from "../utils/familyInsights";

function InsightsPage() {
  const { activitySessions, activityHistory, childProfiles } = useAppContext();
  const { entitlement } = useEntitlementContext();
  const [remoteInsights, setRemoteInsights] = useState(null);
  const [remoteError, setRemoteError] = useState(false);

  const localInsights = useMemo(
    () =>
      buildFamilyInsights({
        activitySessions,
        activityHistory,
        childProfiles,
      }),
    [activitySessions, activityHistory, childProfiles]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchFamilyInsights()
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setRemoteInsights(
          Array.isArray(payload?.insights) ? payload.insights : []
        );
        setRemoteError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activitySessions]);

  const insights = remoteInsights || localInsights;
  const isPlus =
    entitlement?.tier === "plus" ||
    entitlement?.isPlus ||
    entitlement?.hasPlus;

  return (
    <section className="page-layout page-layout--parent">
      <section className="page-intro page-intro--minimal">
        <h1>What works for us</h1>
        <p>
          Patterns from real sessions — not AI guesses. Needs at least three
          matching samples.
        </p>
      </section>

      {!isPlus ? (
        <p className="insights-detail">
          Full insights are a FamilyFlow Plus feature. Local summaries still
          appear below.
        </p>
      ) : null}

      <section className="panel insights-panel">
        {remoteError ? (
          <p className="insights-detail">
            Showing on-device patterns (cloud insights unavailable).
          </p>
        ) : null}
        <ul className="insights-list">
          {insights.map((insight) => (
            <li key={insight.id} className="insights-item">
              <p className="insights-statement">{insight.statement}</p>
              {insight.detail ? (
                <p className="insights-detail">{insight.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="insights-actions">
          <Link className="secondary-action" to="/parent">
            Set a moment
          </Link>
          <Link className="ghost-button" to="/settings">
            View history
          </Link>
        </div>
      </section>
    </section>
  );
}

export default InsightsPage;
