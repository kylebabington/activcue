// src/pages/settings/SettingsHouseholdSection.jsx

import { useEffect, useState } from "react";
import {
  acceptHouseholdInvite,
  getMyHousehold,
  inviteHouseholdMember,
} from "../../api/householdsApi";
import { ApiRequestError } from "../../api/apiClient";

const SHARED_ITEMS = [
  "Children",
  "Supplies",
  "Saved activities",
  "What Works for Us",
  "Activity history",
];

function formatMemberLabel(member) {
  const email =
    typeof member.email === "string" && member.email.trim()
      ? member.email.trim()
      : "";
  if (email) return email;

  const name =
    typeof member.display_name === "string" && member.display_name.trim()
      ? member.display_name.trim()
      : typeof member.name === "string" && member.name.trim()
        ? member.name.trim()
        : "";
  if (name) return name;

  const userId = typeof member.user_id === "string" ? member.user_id : "";
  if (userId.length > 8) {
    return `Member ${userId.slice(0, 8)}`;
  }
  return userId || "Member";
}

function formatRoleLabel(role) {
  if (role === "owner") return "Owner";
  if (role === "viewer") return "Viewer";
  return "Member";
}

function buildInviteLink(token) {
  if (typeof window === "undefined" || !token) return "";
  const url = new URL(window.location.origin);
  url.pathname = "/settings";
  url.searchParams.set("acceptInvite", token);
  return url.toString();
}

export default function SettingsHouseholdSection({ isAnonymous }) {
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
  const [copyStatus, setCopyStatus] = useState("");

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("acceptInvite");
    if (token) {
      setAcceptToken(token);
    }
  }, []);

  async function handleInvite(event) {
    event.preventDefault();
    setInviteBusy(true);
    setInviteResult(null);
    setStatusMessage("");
    setCopyStatus("");
    try {
      const data = await inviteHouseholdMember({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteResult(data.invite || null);
      setInviteEmail("");
      setStatusMessage("Invitation ready. Share the link with your co-parent.");
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
      setStatusMessage("Invite accepted. Your shared household is ready.");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("acceptInvite");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
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

  async function handleCopyInviteLink() {
    const link = buildInviteLink(inviteResult?.token);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus("Invite link copied.");
    } catch {
      setCopyStatus("Could not copy. Select and copy the link below.");
    }
  }

  if (isAnonymous) {
    return (
      <section className="panel">
        <h2>Your household</h2>
        <p>
          Create a free account to invite another adult and share kids,
          supplies, and favorites.
        </p>
        <a className="primary-link-button" href="/signup">
          Create free account
        </a>
      </section>
    );
  }

  const householdName =
    (household?.name && String(household.name).trim()) || "Your household";

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Your household</h2>
          <p>
            Invite another adult so you can share family setup across devices.
          </p>
        </div>
      </div>

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
          <h3 className="household-name">{householdName}</h3>
          <ul className="household-member-list">
            {members.map((member) => (
              <li key={member.id || member.user_id}>
                <strong>{formatMemberLabel(member)}</strong>
                <span>{formatRoleLabel(member.role)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="household-share-list">
        <h3>What household members share</h3>
        <ul>
          {SHARED_ITEMS.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
        </ul>
      </div>

      <form className="onboarding-form-grid" onSubmit={handleInvite}>
        <h3>Invite another adult</h3>
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
            <option value="member">Adult</option>
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <button type="submit" disabled={inviteBusy}>
          {inviteBusy ? "Sending…" : "Send invitation"}
        </button>
      </form>

      {inviteResult?.token ? (
        <div className="household-invite-token">
          <h3>Share this invite link</h3>
          <p className="household-invite-link">{buildInviteLink(inviteResult.token)}</p>
          <button
            type="button"
            className="secondary-action"
            onClick={handleCopyInviteLink}
          >
            Copy invite link
          </button>
          {copyStatus ? (
            <p className="status-message status-message--info" role="status">
              {copyStatus}
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="onboarding-form-grid" onSubmit={handleAccept}>
        <h3>Accept an invite</h3>
        <label>
          Invite link or code
          <input
            value={acceptToken}
            onChange={(event) => {
              const raw = event.target.value;
              try {
                const parsed = new URL(raw);
                const fromQuery = parsed.searchParams.get("acceptInvite");
                setAcceptToken(fromQuery || raw);
              } catch {
                setAcceptToken(raw);
              }
            }}
            required
            placeholder="Paste invite link or code"
          />
        </label>
        <button type="submit" disabled={acceptBusy}>
          {acceptBusy ? "Accepting…" : "Accept invite"}
        </button>
      </form>
    </section>
  );
}
