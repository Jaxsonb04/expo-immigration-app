import { Pool } from "pg";

import { createImmigrationAuth } from "./auth";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run Better Auth migrations.");
}

const auth = createImmigrationAuth({
  pool: new Pool({ connectionString: databaseUrl }),
  baseUrl: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

if (!auth) {
  throw new Error(
    "BETTER_AUTH_URL and BETTER_AUTH_SECRET are required to run Better Auth migrations."
  );
}

export { auth };
export default auth;
