import { useEffect, useState } from "react";
import {
  acceptHouseholdInvite,
  getMyHousehold,
  inviteHouseholdMember,
} from "../../api/householdsApi";
import { ApiRequestError } from "../../api/apiClient";

export default function SettingsHouseholdTab({ isAnonymous }) {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [acceptToken, setAcceptToken] = useState("");
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await getMyHousehold();
      setHousehold(data.household || null);
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not load household."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAnonymous) {
      setLoading(false);
      return;
    }
    refresh();
  }, [isAnonymous]);

  async function handleInvite(event) {
    event.preventDefault();
    setInviteBusy(true);
    setInviteResult(null);
    setStatusMessage("");
    try {
      const data = await inviteHouseholdMember({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteResult(data.invite || null);
      setInviteEmail("");
      setStatusMessage("Invite created. Share the token with your co-parent.");
      await refresh();
    } catch (err) {
      setStatusMessage(
        err instanceof ApiRequestError
          ? err.message
          : "Could not create invite."
      );
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleAccept(event) {
    event.preventDefault();
    setAcceptBusy(true);
    setStatusMessage("");
    try {
      await acceptHouseholdInvite(acceptToken.trim());
      setAcceptToken("");
      setStatusMessage("Invite accepted. Shared household is ready.");
      await refresh();
    } catch (err) {
      setStatusMessage(
        err instanceof ApiRequestError
          ? err.message
          : "Could not accept invite."
      );
    } finally {
      setAcceptBusy(false);
    }
  }

  if (isAnonymous) {
    return (
      <section className="panel">
        <h2>Household</h2>
        <p>
          Create a free account to invite another adult and share kids,
          inventory, and favorites.
        </p>
        <a className="primary-link-button" href="/signup">
          Create free account
        </a>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Household</h2>
      <p>
        Invite another adult by email. After they accept, you share children,
        inventory, and activity memory for this household.
      </p>

      {loading ? <p>Loading household…</p> : null}
      {error ? (
        <p className="status-message status-message--error" role="alert">
          {error}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="status-message status-message--info" role="status">
          {statusMessage}
        </p>
      ) : null}

      {household ? (
        <div className="household-summary">
          <p>
            <strong>Household id:</strong> {household.id}
          </p>
          <h3>Members</h3>
          <ul>
            {members.map((member) => (
              <li key={member.id || member.user_id}>
                {member.user_id} · {member.role || "member"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form className="onboarding-form-grid" onSubmit={handleInvite}>
        <h3>Invite by email</h3>
        <label>
          Email
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            required
            placeholder="coparent@example.com"
          />
        </label>
        <label>
          Role
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
          >
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <button type="submit" disabled={inviteBusy}>
          {inviteBusy ? "Sending…" : "Create invite"}
        </button>
      </form>

      {inviteResult?.token ? (
        <div className="household-invite-token">
          <h3>Share this invite token</h3>
          <code>{inviteResult.token}</code>
        </div>
      ) : null}

      <form className="onboarding-form-grid" onSubmit={handleAccept}>
        <h3>Accept an invite</h3>
        <label>
          Invite token
          <input
            value={acceptToken}
            onChange={(event) => setAcceptToken(event.target.value)}
            required
            placeholder="Paste invite token"
          />
        </label>
        <button type="submit" disabled={acceptBusy}>
          {acceptBusy ? "Accepting…" : "Accept invite"}
        </button>
      </form>
    </section>
  );
}
