// src/constants/demoChildren.js

/**
 * Demo child profiles for landing /demo age toggle.
 * Shape matches resolveChildAge / isEligibleForChildren expectations.
 */
export const DEMO_CHILDREN = Object.freeze({
  maya: {
    id: "demo-maya",
    name: "Maya",
    ageYears: 8,
    ageRange: "6-9",
    birthDate: null,
    interests: "drawing, animals, pretend",
    needs: "",
  },
  jack: {
    id: "demo-jack",
    name: "Jack",
    ageYears: 13,
    ageRange: "13+",
    birthDate: null,
    interests: "building, photography, science",
    needs: "",
  },
  leo: {
    id: "demo-leo",
    name: "Leo",
    ageYears: 6,
    ageRange: "6-9",
    birthDate: null,
    interests: "animals, blocks, stories",
    needs: "",
  },
});

export const DEMO_CHILD_LIST = Object.freeze(Object.values(DEMO_CHILDREN));

export function getDemoChild(id) {
  return DEMO_CHILDREN[id] || DEMO_CHILDREN.maya;
}
