import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp({
	env: {
		// Gates the walkthrough-phase demo seed (convex/dev/seed.ts).
		DEV_SEED_ENABLED: v.optional(v.string()),
	},
});
app.use(betterAuth);

export default app;
