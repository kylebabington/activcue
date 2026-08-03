// src/context/domainContexts.jsx

import { createContext, useContext } from "react";

export const FamilyContext = createContext(null);
export const QuestContext = createContext(null);
export const BillingContext = createContext(null);
export const ActivityContext = createContext(null);
export const EntitlementContext = createContext(null);

export function useFamilyContext() {
  const value = useContext(FamilyContext);
  if (!value) {
    throw new Error("useFamilyContext must be used within FamilyContext.Provider");
  }
  return value;
}

export function useQuestContext() {
  const value = useContext(QuestContext);
  if (!value) {
    throw new Error("useQuestContext must be used within QuestContext.Provider");
  }
  return value;
}

export function useBillingContext() {
  const value = useContext(BillingContext);
  if (!value) {
    throw new Error("useBillingContext must be used within BillingContext.Provider");
  }
  return value;
}

export function useActivityContext() {
  const value = useContext(ActivityContext);
  if (!value) {
    throw new Error(
      "useActivityContext must be used within ActivityContext.Provider"
    );
  }
  return value;
}

export function useEntitlementContext() {
  const value = useContext(EntitlementContext);
  if (!value) {
    throw new Error(
      "useEntitlementContext must be used within EntitlementContext.Provider"
    );
  }
  return value;
}
