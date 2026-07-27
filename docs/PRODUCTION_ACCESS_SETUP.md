# Production Access and Secrets Setup

This guide contains the manual account and secret setup required before the first
App Store build. Do not paste passwords, API keys, deploy keys, or App Review
credentials into chat, source files, issues, or commit messages.

## What Codex needs

Codex does not need to see any secret value. Complete the account logins and
store each secret directly in its intended service. After each section, Codex
can verify names, permissions, public endpoints, and release checks without
printing secret values.

### Secret inventory

| Name                       | How to obtain it                                       | Store it in                                    | Never store it in                                            |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| `HEROUI_KEY`               | Use the trusted vendor key beginning with `hp_`        | EAS `production`, visibility `secret`          | Git, Expo `EXPO_PUBLIC_*`, chat                              |
| `BETTER_AUTH_SECRET`       | Generate a new random production-only value            | Convex production environment                  | EAS, Git, chat                                               |
| `AUTH_EMAIL_WEBHOOK_TOKEN` | Generate a new random bearer token                     | Convex production and the private webhook host | The mobile app, Git, chat                                    |
| Email-provider API key     | Create it with the chosen transactional-email provider | Private webhook host only                      | Convex unless it directly calls the provider, EAS, Git, chat |

Expo, Apple, Convex, GitHub, mailbox, and email-provider passwords are account
credentials. Codex never needs them.

The Convex URLs, auth URL, privacy URL, support URL, support email, sender name,
and release confirmation flags are configuration, not secrets.

## 1. Convex project and migrated environments

The local project is linked to:

- Team: `jaxson-bie` (Jaxson Bie's team)
- Project: `immifile`
- Development deployment: `wandering-jaguar-543`
- Production deployment: `enduring-toucan-31`

The previous Oliver-team development database was exported with file storage,
rewritten to the new deployment-scoped owner identifiers, and imported into
`wandering-jaguar-543`. Production intentionally started clean. The backup is
kept only in the ignored local `.scratch/convex-migration/` directory.

Verify access without printing values:

```sh
npx convex login status
npx convex env list --names-only --deployment jaxson-bie:immifile:prod
```

Production code is deployed and currently expects `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, and `DEV_SEED_ENABLED`.

## 2. Set Convex production secrets

Generate fresh production-only values locally:

```sh
openssl rand -base64 48
openssl rand -hex 32
```

Use the first output for `BETTER_AUTH_SECRET` and the second for
`AUTH_EMAIL_WEBHOOK_TOKEN`. Do not reuse development values.

The safest CLI workflow is interactive because the value stays out of shell
history. For each command, paste the value at the prompt:

```sh
npx convex env set BETTER_AUTH_SECRET --prod
npx convex env set BETTER_AUTH_URL --prod
npx convex env set AUTH_EMAIL_WEBHOOK_TOKEN --prod
npx convex env set AUTH_EMAIL_WEBHOOK_URL --prod
npx convex env set AUTH_EMAIL_FROM --prod
npx convex env set DEV_SEED_ENABLED false --prod
```

Use a public HTTPS URL for `AUTH_EMAIL_WEBHOOK_URL` and a verified sender such
as `Immifile Support <support@immifile.app>` for `AUTH_EMAIL_FROM`.

Verify names only:

```sh
npx convex env list --prod --names-only
```

Then deploy:

```sh
npx convex deploy
```

Do not set `IMMIFILE_PRODUCTION_BACKEND_CONFIRMED=true` until that deployment
succeeds and `DEV_SEED_ENABLED` is false.

## 3. Configure the support mailbox and password-reset email

The `immifile.app` domain currently has no MX records. Before publishing
`support@immifile.app`:

1. Create a real monitored mailbox with the chosen mailbox provider.
2. Add the provider's exact MX, SPF, and DKIM DNS records.
3. Confirm inbound mail works from an unrelated email account.
4. Confirm this command returns at least one MX record:

   ```sh
   dig +short MX immifile.app
   ```

Choose a transactional-email provider, verify the sending domain, and create a
private HTTPS webhook that follows `docs/AUTH_EMAIL_WEBHOOK.md`. The same
`AUTH_EMAIL_WEBHOOK_TOKEN` must be configured on the webhook host. Its
email-provider API key belongs only on that host.

Name the chosen provider in `docs/PRIVACY_POLICY.md`. Complete the end-to-end
reset test in `docs/AUTH_EMAIL_WEBHOOK.md` before enabling password recovery in
the production app.

## 4. Log in to Expo and link the EAS project

This repository is linked to EAS project
`@jaxson04s-team/immifile` (`ba1f9a98-c9d2-439c-92d0-50f591ddc8cf`).
The CLI is authenticated on the release workstation. To refresh the login:

```sh
npx eas-cli login
npx eas-cli whoami
npx eas-cli project:info
```

Use the Expo account that owns `jaxson04s-team`.

## 5. Store the trusted HeroUI key in EAS

The vendor key must begin with `hp_`. Do not put it in `.env.production`,
`.env.local`, `app.json`, or any `EXPO_PUBLIC_*` variable.

After EAS login and project linking, enter it without displaying it:

```sh
read -r -s -p "HeroUI hp_ key: " HEROUI_KEY
echo
npx eas-cli env:set production \
  --name HEROUI_KEY \
  --value "$HEROUI_KEY" \
  --visibility secret \
  --scope project \
  --non-interactive
unset HEROUI_KEY
```

The release build runs:

```sh
npx -y hpsetup@latest native --auto
```

The current `heroui-native-pro` version is already cached locally, so no local
install is required. For vendor diagnostics, use `--dry-run`, which consumes no
quota. Never use `--no-cache` for this workflow. Each uncached EAS CI install
uses one of the vendor's 20 daily CI installations.

## 6. Set the EAS production configuration

Create these as `plaintext` project variables because they are intentionally
embedded in the client build:

```text
EXPO_PUBLIC_CONVEX_URL
EXPO_PUBLIC_CONVEX_SITE_URL
EXPO_PUBLIC_AUTH_SITE_URL
EXPO_PUBLIC_PRIVACY_URL
EXPO_PUBLIC_SUPPORT_URL
EXPO_PUBLIC_SUPPORT_EMAIL
EXPO_PUBLIC_PASSWORD_RECOVERY_ENABLED
IMMIFILE_PRODUCTION_BACKEND_CONFIRMED
IMMIFILE_AUTH_EMAIL_CONFIRMED
```

Use the EAS dashboard or this pattern:

```sh
npx eas-cli env:set production \
  --name NAME \
  --value "VALUE" \
  --visibility plaintext \
  --scope project \
  --non-interactive
```

Important:

- Use the production `.convex.cloud` and `.convex.site` URLs, never the personal
  development deployment.
- Set `EXPO_PUBLIC_PASSWORD_RECOVERY_ENABLED=true` and
  `IMMIFILE_AUTH_EMAIL_CONFIRMED=true` only after the real reset-email test.
- Set `IMMIFILE_PRODUCTION_BACKEND_CONFIRMED=true` only after the production
  Convex deploy and seed lockout are verified.
- `HEROUI_KEY` must remain a separate EAS `secret`.

Verify variable names and visibility without exposing secret values:

```sh
npx eas-cli env:list production
```

## 7. Publish legal and support pages

1. Replace every `REQUIRED:` placeholder in the App Store documents.
2. Put the monitored private support email in `docs/SUPPORT.md`.
3. Commit and push the reviewed pages.
4. In GitHub, open **Settings → Pages** and set **Source** to
   **GitHub Actions**.
5. Open the privacy and support URLs in a signed-out browser.

Do not submit until both URLs are public, stable, and match the app.

## 8. Apple-only manual work

In App Store Connect:

1. Accept all pending agreements and confirm tax/banking requirements applicable
   to the account.
2. Create the app record for bundle ID
   `dev.uing.immigrationrenewalhelp`.
3. Complete App Privacy from the reviewed draft in
   `docs/APP_STORE_METADATA.md`.
4. Add the public privacy and support URLs.
5. Create a dedicated production demo account for App Review and put its
   credentials only in App Store Connect review notes.
6. Upload the production EAS build, answer export-compliance questions, select
   the build, and submit it for review.

Never send Apple credentials, two-factor codes, certificates, or the demo
password through chat.

## 9. Final verification

After all manual setup:

```sh
npm run release:config
npm run typecheck
npm run lint
npm run test:once
npx expo-doctor
npx expo export --platform ios
```

Load the public EAS production variables locally without exposing
`HEROUI_KEY`, then run:

```sh
npm run release:remote-check
```

Finally, install the production-profile build on physical iPhone and iPad
hardware and complete the test matrix in `docs/APP_STORE_RELEASE.md`.
