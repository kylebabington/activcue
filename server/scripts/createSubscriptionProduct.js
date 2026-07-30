// server/scripts/createSubscriptionProduct.js
//
// One-time setup: create the Managed Payments subscription product + monthly
// price from the Stripe blueprint, then copy the printed price id into
// STRIPE_MONTHLY_PRICE_ID in server/.env.
//
// Usage (from repo root):
//   node server/scripts/createSubscriptionProduct.js
//
// Requires STRIPE_SECRET_KEY in server/.env (from https://dashboard.stripe.com/apikeys).
// Accept Managed Payments Terms of Service in the Stripe Dashboard before charging.

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Stripe from "stripe";

import { managedPaymentsRequestOptions } from "../lib/stripeClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, "..", ".env"),
});

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error(
    [
      "STRIPE_SECRET_KEY is missing.",
      "Add it to server/.env from https://dashboard.stripe.com/apikeys",
      "then run this script again.",
    ].join("\n")
  );
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const product = await stripe.products.create(
  {
    name: "Basic subscription",
    description: "A basic subscription to our service",
    tax_code: "txcd_10103100",
    default_price_data: {
      unit_amount: 1000,
      currency: "usd",
      recurring: {
        interval: "month",
      },
    },
  },
  managedPaymentsRequestOptions
);

const defaultPriceId =
  typeof product.default_price === "string"
    ? product.default_price
    : product.default_price?.id || null;

console.log(
  [
    "Created subscription product.",
    `product_id: ${product.id}`,
    `default_price (STRIPE_MONTHLY_PRICE_ID): ${defaultPriceId}`,
    "",
    "Add this to server/.env:",
    `STRIPE_MONTHLY_PRICE_ID=${defaultPriceId}`,
  ].join("\n")
);
