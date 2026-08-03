// src/features/family/useChildProfiles.js

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
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return trimmed.slice(0, 10);
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

  function resolveBirthDateForSave() {
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
    if (Number.isFinite(ageYears) && ageYears >= 0 && ageYears <= 25) {
      const synthetic = birthDateFromAgeYears(ageYears);
      return {
        birthDate: synthetic,
        ageRange: ageYearsToAgeRange(ageYears),
        ageYears,
      };
    }

    // Keep ageRange fallback when neither birthday nor exact age provided.
    return {
      birthDate: null,
      ageRange: newChildAgeRange || "6-9",
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

    const resolved = resolveBirthDateForSave();
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
    setEditingChildId(child.id);
    setNewChildName(child.name || "");
    setNewChildAgeRange(child.ageRange || "6-9");
    setNewChildBirthDate(child.birthDate || "");
    if (child.birthDate) {
      const age = calculateAge(child.birthDate);
      setNewChildAgeYears(Number.isFinite(age) ? String(age) : "");
    } else {
      setNewChildAgeYears("");
    }
    setNewChildInterests(child.interests || "");
    setNewChildNeeds(child.needs || "");
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
    if (Number.isFinite(ageYears) && ageYears >= 0 && ageYears <= 25) {
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
