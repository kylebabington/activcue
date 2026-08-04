import { useState } from "react";
import {
  ageYearsToAgeRange,
  birthDateFromAgeYears,
  calculateAge,
  resolveChildAge,
} from "../../utils/childAge";

function normalizeBirthDateInput(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Prefer strict YYYY-MM-DD from date inputs.
  const isoDay = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) {
    const [year, month, day] = isoDay.split("-").map(Number);
    const local = new Date(year, month - 1, day);
    if (
      local.getFullYear() !== year ||
      local.getMonth() !== month - 1 ||
      local.getDate() !== day
    ) {
      return null;
    }
    return isoDay;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asTextField(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
}

export function useChildProfiles({
  showStatus,
  childAgeRangeFallback = "6-9",
} = {}) {
  const [childProfiles, setChildProfiles] = useState([]);
  const [activeChildId, setActiveChildId] = useState("");
  const [playingChildIds, setPlayingChildIds] = useState([]);
  const [activityMode, setActivityMode] = useState("single-child");
  const [newChildName, setNewChildName] = useState("");
  const [newChildAgeRange, setNewChildAgeRange] = useState("6-9");
  const [newChildBirthDate, setNewChildBirthDate] = useState("");
  const [newChildAgeYears, setNewChildAgeYears] = useState("");
  const [newChildInterests, setNewChildInterests] = useState("");
  const [newChildNeeds, setNewChildNeeds] = useState("");
  const [editingChildId, setEditingChildId] = useState("");

  function applyPlayingSelection(nextIds, profiles = childProfiles) {
    const profileIds = new Set(profiles.map((child) => child.id));
    let next = nextIds.filter((id) => profileIds.has(id));

    if (next.length === 0 && profiles.length > 0) {
      next = [profiles[0].id];
    }

    setPlayingChildIds(next);

    if (next.length <= 1) {
      setActivityMode("single-child");
      setActiveChildId(next[0] || "");
      return;
    }

    setActivityMode("family");
    setActiveChildId("");
  }

  function togglePlayingChild(childId) {
    const isSelected = playingChildIds.includes(childId);

    if (isSelected && playingChildIds.length <= 1) {
      return;
    }

    const next = isSelected
      ? playingChildIds.filter((id) => id !== childId)
      : [...playingChildIds, childId];

    applyPlayingSelection(next);
  }

  function cancelEditingChildProfile() {
    setEditingChildId("");
    setNewChildName("");
    setNewChildAgeRange("6-9");
    setNewChildBirthDate("");
    setNewChildAgeYears("");
    setNewChildInterests("");
    setNewChildNeeds("");
  }

  function resolveBirthDateForSave(existingChild = null) {
    const fromInput = normalizeBirthDateInput(newChildBirthDate);
    if (fromInput) {
      const age = calculateAge(fromInput);
      if (!Number.isFinite(age) || age > 25) {
        return { error: "Enter a realistic birthday." };
      }
      return {
        birthDate: fromInput,
        ageRange: ageYearsToAgeRange(age),
        ageYears: age,
      };
    }

    const ageYears = Math.floor(Number(newChildAgeYears));
    if (
      newChildAgeYears !== "" &&
      Number.isFinite(ageYears) &&
      ageYears >= 0 &&
      ageYears <= 25
    ) {
      const synthetic = birthDateFromAgeYears(ageYears);
      return {
        birthDate: synthetic,
        ageRange: ageYearsToAgeRange(ageYears),
        ageYears,
      };
    }

    // Editing: keep previous birthDate when age fields were left blank.
    if (editingChildId && existingChild?.birthDate) {
      const kept = normalizeBirthDateInput(existingChild.birthDate);
      if (kept) {
        const age = calculateAge(kept);
        return {
          birthDate: kept,
          ageRange: Number.isFinite(age)
            ? ageYearsToAgeRange(age)
            : existingChild.ageRange || newChildAgeRange || "6-9",
          ageYears: Number.isFinite(age) ? age : null,
        };
      }
    }

    return {
      birthDate: null,
      ageRange: newChildAgeRange || existingChild?.ageRange || "6-9",
      ageYears: null,
    };
  }

  function addChildProfile() {
    const cleanedName = newChildName.trim();
    const cleanedInterests = newChildInterests.trim();
    const cleanedNeeds = newChildNeeds.trim();

    if (cleanedName === "") {
      showStatus?.("Child name is required.", "error");
      return;
    }

    const duplicateChild = childProfiles.some(
      (child) =>
        child.name.toLowerCase() === cleanedName.toLowerCase() &&
        child.id !== editingChildId
    );

    if (duplicateChild) {
      showStatus?.("A child with that name already exists.", "error");
      return;
    }

    const existingChild = editingChildId
      ? childProfiles.find((child) => child.id === editingChildId) || null
      : null;

    const resolved = resolveBirthDateForSave(existingChild);
    if (resolved.error) {
      showStatus?.(resolved.error, "error");
      return;
    }

    if (editingChildId) {
      const updatedChildren = childProfiles.map((child) => {
        if (child.id !== editingChildId) {
          return child;
        }

        return {
          ...child,
          name: cleanedName,
          ageRange: resolved.ageRange,
          birthDate: resolved.birthDate,
          interests: cleanedInterests,
          needs: cleanedNeeds,
        };
      });

      setChildProfiles(updatedChildren);
      cancelEditingChildProfile();
      showStatus?.(`Updated child profile for ${cleanedName}.`, "success");
      return;
    }

    const childToAdd = {
      id: crypto.randomUUID(),
      name: cleanedName,
      ageRange: resolved.ageRange,
      birthDate: resolved.birthDate,
      interests: cleanedInterests,
      needs: cleanedNeeds,
      createdAt: new Date().toISOString(),
    };

    const updatedChildren = [...childProfiles, childToAdd];

    setChildProfiles(updatedChildren);
    applyPlayingSelection([childToAdd.id], updatedChildren);
    cancelEditingChildProfile();
    showStatus?.(`Added child profile for ${cleanedName}.`, "success");
  }

  function startEditingChildProfile(child) {
    const normalizedBirth = normalizeBirthDateInput(child.birthDate || "");
    const resolved = resolveChildAge(child);
    const ageRange =
      child.ageRange ||
      (Number.isFinite(resolved.ageYears)
        ? ageYearsToAgeRange(resolved.ageYears)
        : "6-9");

    setEditingChildId(child.id);
    setNewChildName(asTextField(child.name) || "");
    setNewChildAgeRange(ageRange);
    setNewChildBirthDate(normalizedBirth || "");
    setNewChildAgeYears(
      Number.isFinite(resolved.ageYears) ? String(resolved.ageYears) : ""
    );
    setNewChildInterests(asTextField(child.interests));
    setNewChildNeeds(asTextField(child.needs));

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document
          .getElementById("child-profile-form")
          ?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
        document.getElementById("child-profile-name-input")?.focus?.();
      });
    }
  }

  function deleteChildProfile(childIdToDelete) {
    const childToDelete = childProfiles.find(
      (child) => child.id === childIdToDelete
    );

    const confirmed = window.confirm(
      childToDelete
        ? `Delete child profile for ${childToDelete.name}?`
        : "Delete this child profile?"
    );

    if (!confirmed) {
      return;
    }

    const remainingProfiles = childProfiles.filter(
      (child) => child.id !== childIdToDelete
    );

    setChildProfiles(remainingProfiles);
    applyPlayingSelection(
      playingChildIds.filter((id) => id !== childIdToDelete),
      remainingProfiles
    );

    if (editingChildId === childIdToDelete) {
      cancelEditingChildProfile();
    }

    showStatus?.(
      childToDelete
        ? `Deleted child profile for ${childToDelete.name}.`
        : "Child profile deleted.",
      "success"
    );
  }

  const activeChildProfile =
    childProfiles.find((child) => child.id === activeChildId) ||
    childProfiles.find((child) => playingChildIds.includes(child.id)) ||
    null;

  const selectedChildProfiles = childProfiles.filter((child) =>
    playingChildIds.includes(child.id)
  );

  const effectiveChildAgeRange = activeChildProfile
    ? activeChildProfile.ageRange ||
      ageYearsToAgeRange(resolveChildAge(activeChildProfile).ageYears)
    : childAgeRangeFallback;

  const agePreviewYears = (() => {
    const fromBirth = normalizeBirthDateInput(newChildBirthDate);
    if (fromBirth) {
      const age = calculateAge(fromBirth);
      return Number.isFinite(age) ? age : null;
    }
    const ageYears = Math.floor(Number(newChildAgeYears));
    if (
      newChildAgeYears !== "" &&
      Number.isFinite(ageYears) &&
      ageYears >= 0 &&
      ageYears <= 25
    ) {
      return ageYears;
    }
    return null;
  })();

  return {
    childProfiles,
    setChildProfiles,
    activeChildId,
    setActiveChildId,
    playingChildIds,
    setPlayingChildIds,
    activityMode,
    setActivityMode,
    newChildName,
    setNewChildName,
    newChildAgeRange,
    setNewChildAgeRange,
    newChildBirthDate,
    setNewChildBirthDate,
    newChildAgeYears,
    setNewChildAgeYears,
    newChildInterests,
    setNewChildInterests,
    newChildNeeds,
    setNewChildNeeds,
    editingChildId,
    setEditingChildId,
    applyPlayingSelection,
    togglePlayingChild,
    addChildProfile,
    startEditingChildProfile,
    cancelEditingChildProfile,
    deleteChildProfile,
    activeChildProfile,
    selectedChildProfiles,
    effectiveChildAgeRange,
    agePreviewYears,
  };
}
