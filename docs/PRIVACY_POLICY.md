---
layout: default
title: Immifile Privacy Policy
permalink: /privacy/
---

# Immifile Privacy Policy

Effective July 25, 2026

This policy describes the first App Store release of Immifile. That release provides a manual USCIS case tracker and links to official government resources. Filing preparation, document uploads, the AI assistant, and the public community are not available.

## Data we collect

Immifile automatically creates a temporary account when a person continues past the welcome screen. A person may create a permanent account by providing a name, email address, and password. Authentication infrastructure may also process security metadata such as session identifiers, IP address, and user agent.

When a person saves a case, Immifile stores the USCIS receipt number and any status or note the person enters. The app also stores small preferences and operational records needed to provide and secure the service.

## How we use data

We use data to authenticate users, display their saved cases, maintain the timelines they enter, protect the service, and provide support. Immifile does not sell personal data, display advertising, or use third-party advertising, tracking, or analytics SDKs.

## Service providers

Convex provides the hosted application backend, database, and authentication components. Official USCIS and Department of Justice links open in the device browser.

## Retention and deletion

A temporary account becomes eligible for permanent deletion after it is 48 hours old. Cleanup runs hourly, so deletion occurs during an hourly cleanup after the account becomes eligible rather than at the exact 48-hour instant. A delayed or failed cleanup is retried by a later run.

In the app, open **Account → Settings → Delete account** to permanently delete the login identity, sessions, saved cases, and all other associated Immifile data.

After either deletion path, Immifile may retain a short-lived opaque deletion-protection record for up to one hour. It contains no saved case content and is used only to reject requests made with a previously issued session while that session expires. It cannot be used to restore the deleted account and is removed after the protection window.

## Security and choices

Immifile transmits authentication and application data over encrypted connections and stores the app session using secure device storage. A person can browse official resources without creating a permanent account. Saving a receipt number requires a permanent account.

## Support and privacy requests

Use **Account → Support** in the app or read the public [Immifile support information](https://github.com/Jaxsonb04/expo-immigration-app/blob/main/docs/SUPPORT.md) for current contact options.

The [GitHub issue tracker](https://github.com/Jaxsonb04/expo-immigration-app/issues/new) is public, requires a GitHub account, and is only suitable for non-sensitive app bugs or general feedback. Never use it for a privacy request or include receipt numbers, A-Numbers, addresses, passwords, or other sensitive immigration information.

A monitored private support contact and stable public support and privacy-policy URLs must be published and verified before App Store distribution. Until those submission gates are complete, do not send private account information through a public channel.
