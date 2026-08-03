// src/pages/InsightsPage.jsx

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { buildFamilyInsights } from "../utils/familyInsights";

function InsightsPage() {
  const { activitySessions, activityHistory, childProfiles } = useAppContext();

  const insights = useMemo(
    () =>
      buildFamilyInsights({
        activitySessions,
        activityHistory,
        childProfiles,
      }),
    [activitySessions, activityHistory, childProfiles]
  );

  return (
    <section className="page-layout page-layout--parent">
      <section className="page-intro page-intro--minimal">
        <h1>What works for us</h1>
        <p>Short patterns from recent activities — nothing fancy.</p>
      </section>

      <section className="panel insights-panel">
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
