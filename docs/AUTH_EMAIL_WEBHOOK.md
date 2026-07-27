# Authentication Email Webhook

This is a future-release design. Password recovery is source-controlled off for
the first App Store release, so no transactional-email provider or webhook is
required for that build.

Immifile keeps the transactional-email provider outside the app and Convex source code. Production password recovery is enabled only after a private HTTPS webhook is configured and tested.

## Convex production environment

Set all three values:

- `AUTH_EMAIL_WEBHOOK_URL`: a public HTTPS endpoint that accepts the request below.
- `AUTH_EMAIL_WEBHOOK_TOKEN`: a strong bearer token shared only by Convex and the endpoint.
- `AUTH_EMAIL_FROM`: a verified sender, for example `Immifile Support <support@example.com>`.

If any value is missing or unsafe, the backend fails closed and does not expose password recovery.

## Request contract

Convex sends:

```http
POST /configured-path
Authorization: Bearer <AUTH_EMAIL_WEBHOOK_TOKEN>
Content-Type: application/json
```

```json
{
	"kind": "password_reset",
	"to": "person@example.com",
	"from": "Immifile Support <support@example.com>",
	"subject": "Reset your Immifile password",
	"text": "Use this secure link to reset your Immifile password:\nhttps://...\n\nThis link expires in one hour..."
}
```

The endpoint must authenticate the bearer token, deliver the message through the chosen transactional-email provider, and return a `2xx` response only after accepting the message. It must not log the reset URL or message body. The reset URL contains a one-time credential valid for one hour.

No receipt number, case note, or other saved case data is sent to this endpoint.

## Required production test

1. Create a disposable production email/password account.
2. Request a reset from the app.
3. Confirm the message arrives and the link opens Immifile.
4. Set a new password.
5. Confirm the old password fails, the new password succeeds, and all earlier sessions are signed out.
6. Delete the disposable account.
7. Only then set `EXPO_PUBLIC_PASSWORD_RECOVERY_ENABLED=true` and `IMMIFILE_AUTH_EMAIL_CONFIRMED=true` in the EAS production environment.

Name the chosen email provider in the public privacy policy before submission.
