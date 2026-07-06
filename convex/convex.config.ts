import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp({
	env: {
		// Gates the walkthrough-phase demo seed (convex/dev/seed.ts).
		DEV_SEED_ENABLED: v.optional(v.string()),
		// Anthropic Messages API for the Claude assistant (convex/assistant.ts).
		// Deployment secrets only — never exposed to the client. Set with
		// `npx convex env set ANTHROPIC_API_KEY <key>`; ANTHROPIC_MODEL defaults
		// to claude-opus-4-8 when unset.
		ANTHROPIC_API_KEY: v.optional(v.string()),
		ANTHROPIC_MODEL: v.optional(v.string()),
	},
});
app.use(betterAuth);

export default app;
