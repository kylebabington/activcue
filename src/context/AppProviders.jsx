// src/context/AppProviders.jsx

import { useMemo } from "react";
import { AppProvider } from "./AppContext";
import {
  ActivityContext,
  BillingContext,
  EntitlementContext,
  FamilyContext,
  QuestContext,
} from "./domainContexts";

/**
 * Domain + legacy app context providers for the authenticated app shell.
 * App owns data/orchestration and passes value objects in.
 */
export function AppProviders({
  familyContextValue,
  questContextValue,
  billingContextValue,
  activityContextValue,
  children,
}) {
  const entitlementContextValue = billingContextValue;
  const appContextValue = useMemo(
    () => ({
      ...familyContextValue,
      ...questContextValue,
      ...billingContextValue,
      ...activityContextValue,
    }),
    [
      familyContextValue,
      questContextValue,
      billingContextValue,
      activityContextValue,
    ]
  );

  return (
    <AppProvider value={appContextValue}>
      <FamilyContext.Provider value={familyContextValue}>
        <QuestContext.Provider value={questContextValue}>
          <BillingContext.Provider value={billingContextValue}>
            <EntitlementContext.Provider value={entitlementContextValue}>
              <ActivityContext.Provider value={activityContextValue}>
                {children}
              </ActivityContext.Provider>
            </EntitlementContext.Provider>
          </BillingContext.Provider>
        </QuestContext.Provider>
      </FamilyContext.Provider>
    </AppProvider>
  );
}
