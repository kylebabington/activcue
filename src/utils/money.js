// src/utils/money.js

/*
 * Format a Stripe unit_amount (smallest currency unit) for display.
 */
export function formatStripeAmount(unitAmount, currency = "usd") {
  const amount = Number(unitAmount);
  if (!Number.isFinite(amount)) {
    return "";
  }

  const normalizedCurrency =
    typeof currency === "string" && currency.trim()
      ? currency.trim().toLowerCase()
      : "usd";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

export function intervalLabelForPlan(interval) {
  if (interval === "year") {
    return "per year";
  }
  if (interval === "month") {
    return "per month";
  }
  if (typeof interval === "string" && interval.trim()) {
    return `per ${interval.trim()}`;
  }
  return "";
}
