// server/utils/childAge.js — keep in sync with src/utils/childAge.js

export const AGE_BANDS = Object.freeze([
  "young-child",
  "early-elementary",
  "elementary",
  "older-elementary",
  "tween",
  "young-teen",
  "teen",
]);

const AGE_RANGE_APPROX_YEARS = Object.freeze({
  "3-5": 4,
  "6-9": 7,
  "10-12": 11,
  "13+": 14,
});

export function calculateAge(birthDate, today = new Date()) {
  if (!birthDate || typeof birthDate !== "string") {
    return NaN;
  }

  const trimmed = birthDate.trim();
  const isoDay = trimmed.slice(0, 10);
  let birthday;

  // Parse YYYY-MM-DD as local calendar date (avoid UTC off-by-one).
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) {
    const [year, month, day] = isoDay.split("-").map(Number);
    birthday = new Date(year, month - 1, day);
    if (
      birthday.getFullYear() !== year ||
      birthday.getMonth() !== month - 1 ||
      birthday.getDate() !== day
    ) {
      return NaN;
    }
  } else {
    birthday = new Date(trimmed);
    if (Number.isNaN(birthday.getTime())) {
      return NaN;
    }
  }

  let age = today.getFullYear() - birthday.getFullYear();

  const birthdayHasNotOccurred =
    today.getMonth() < birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() &&
      today.getDate() < birthday.getDate());

  if (birthdayHasNotOccurred) {
    age -= 1;
  }

  return age < 0 ? 0 : age;
}

export function getAgeBand(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n < 0) {
    return "elementary";
  }
  if (n <= 5) return "young-child";
  if (n <= 7) return "early-elementary";
  if (n <= 9) return "elementary";
  if (n <= 11) return "older-elementary";
  if (n === 12) return "tween";
  if (n <= 14) return "young-teen";
  return "teen";
}

export function ageRangeToApproxYears(ageRange) {
  const key = String(ageRange || "").trim();
  if (Object.prototype.hasOwnProperty.call(AGE_RANGE_APPROX_YEARS, key)) {
    return AGE_RANGE_APPROX_YEARS[key];
  }
  return 7;
}

export function birthDateFromAgeYears(ageYears, today = new Date()) {
  const age = Math.floor(Number(ageYears));
  if (!Number.isFinite(age) || age < 0 || age > 25) {
    return null;
  }

  const year = today.getFullYear() - age;
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ageYearsToAgeRange(ageYears) {
  const age = Number(ageYears);
  if (!Number.isFinite(age)) return "6-9";
  if (age <= 5) return "3-5";
  if (age <= 9) return "6-9";
  if (age <= 12) return "10-12";
  return "13+";
}

export function resolveChildAge(profile, today = new Date()) {
  // Prefer explicit ageYears from an immutable request snapshot.
  if (Number.isFinite(Number(profile?.ageYears))) {
    const ageYears = Number(profile.ageYears);
    return {
      ageYears,
      ageBand:
        typeof profile?.ageBand === "string" && profile.ageBand.trim()
          ? profile.ageBand.trim()
          : getAgeBand(ageYears),
      source: "ageYears",
    };
  }

  const birthDate =
    typeof profile?.birthDate === "string" ? profile.birthDate.trim() : "";

  if (birthDate) {
    const ageYears = calculateAge(birthDate, today);
    if (Number.isFinite(ageYears)) {
      return {
        ageYears,
        ageBand: getAgeBand(ageYears),
        source: "birthDate",
      };
    }
  }

  const ageYears = ageRangeToApproxYears(profile?.ageRange);
  return {
    ageYears,
    ageBand: getAgeBand(ageYears),
    source: "ageRange",
  };
}

export function getGroupAgeContext(ages) {
  const list = (Array.isArray(ages) ? ages : [])
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age));

  if (list.length === 0) {
    return {
      ages: [],
      youngestAge: 0,
      oldestAge: 0,
      ageSpan: 0,
      isMixedAge: false,
    };
  }

  const youngestAge = Math.min(...list);
  const oldestAge = Math.max(...list);

  return {
    ages: list,
    youngestAge,
    oldestAge,
    ageSpan: oldestAge - youngestAge,
    isMixedAge: oldestAge - youngestAge >= 3,
  };
}

export function parseInterestsList(interests) {
  if (Array.isArray(interests)) {
    return interests
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof interests !== "string" || !interests.trim()) {
    return [];
  }
  return interests
    .split(/[,;|/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildChildrenAgeContext(profiles, today = new Date()) {
  const list = Array.isArray(profiles) ? profiles : [];
  return list.map((child) => {
    const resolved = resolveChildAge(child, today);
    return {
      id: child?.id || "",
      name: child?.name || "Unnamed child",
      ageYears: resolved.ageYears,
      ageBand: resolved.ageBand,
      ageSource: resolved.source,
      interests: parseInterestsList(child?.interests),
      needs:
        typeof child?.needs === "string" && child.needs.trim()
          ? child.needs.trim()
          : "",
      avoids: parseInterestsList(child?.avoids),
      independenceLevel:
        typeof child?.independenceLevel === "string" &&
        child.independenceLevel.trim()
          ? child.independenceLevel.trim()
          : "usually-independent",
      birthDate: child?.birthDate || null,
      ageRange: child?.ageRange || ageYearsToAgeRange(resolved.ageYears),
    };
  });
}

export function isEligibleForChildren(activity, ages) {
  const list = (Array.isArray(ages) ? ages : [])
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age));

  if (list.length === 0) {
    return true;
  }

  const ageFit = activity?.ageFit;
  if (!ageFit || typeof ageFit !== "object") {
    return true;
  }

  const minAge = Number(ageFit.minAge);
  const maxAge = Number(ageFit.maxAge);
  if (!Number.isFinite(minAge) || !Number.isFinite(maxAge)) {
    return true;
  }

  return list.every((age) => age >= minAge && age <= maxAge);
}

export function validateAgeFit(activity, childAges) {
  return isEligibleForChildren(activity, childAges);
}
