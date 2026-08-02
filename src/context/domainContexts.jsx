// src/context/domainContexts.jsx

import { createContext, useContext } from "react";

export const FamilyContext = createContext(null);
export const QuestContext = createContext(null);
export const BillingContext = createContext(null);

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
