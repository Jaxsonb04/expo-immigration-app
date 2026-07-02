/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as applicants from "../applicants.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as dev_seed from "../dev/seed.js";
import type * as home from "../home.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as model_applications from "../model/applications.js";
import type * as model_ownerData from "../model/ownerData.js";
import type * as shared_applicationShapes from "../shared/applicationShapes.js";
import type * as shared_interviewSteps from "../shared/interviewSteps.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  applicants: typeof applicants;
  applications: typeof applications;
  auth: typeof auth;
  "dev/seed": typeof dev_seed;
  home: typeof home;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "model/applications": typeof model_applications;
  "model/ownerData": typeof model_ownerData;
  "shared/applicationShapes": typeof shared_applicationShapes;
  "shared/interviewSteps": typeof shared_interviewSteps;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
