-- Idempotent Stripe webhook processing ledger.

CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_events" (
    "stripe_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("stripe_event_id")
);

ALTER TABLE "public"."stripe_webhook_events" OWNER TO "postgres";

ALTER TABLE "public"."stripe_webhook_events" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";

REVOKE ALL ON TABLE "public"."stripe_webhook_events" FROM "anon";
REVOKE ALL ON TABLE "public"."stripe_webhook_events" FROM "authenticated";
