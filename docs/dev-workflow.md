# WhatYouDink app — dev workflow

This file documents how to run, preview, and ship app changes safely while
production remains live.

## Three channels

`eas.json` defines three EAS channels:

| Channel       | Purpose                                            |
| ------------- | -------------------------------------------------- |
| `development` | Local dev builds — live-reloaded from your laptop  |
| `preview`     | Internal testing builds, separate from production  |
| `production`  | What real users get                                |

Each build profile in `eas.json` is locked to its channel, so a development or
preview build will **never pick up a production update** and vice versa.

## Daily workflow

### 1. Local development (fastest, what you'll use 95% of the time)

1. On your phone, open the **Dev Build** of WhatYouDink (the one EAS built with
   `--profile development` — it has a dev-client launcher, not the production
   icon). If you don't have one yet, build it once:

   ```bash
   eas build --profile development --platform ios   # or android
   ```

2. On your laptop, in this repo:

   ```bash
   npx expo start --dev-client
   ```

3. Scan the QR shown in your terminal with your phone (camera, then "Open in
   WhatYouDink Dev"). The app loads from your laptop's Metro bundler and
   live-reloads as I save files. Zero impact on production.

### 2. Internal preview build (when you want to hand a phone to someone)

```bash
eas build --profile preview --platform all
```

You'll get a downloadable APK + a TestFlight invite for iOS. Install it
alongside the production app (different icon if you set a separate name in
`app.json` for the preview profile, or visually identical if not — but it
runs against the `preview` channel either way).

### 3. EAS Update — push JS-only changes without rebuilding (preview channel)

Most of what we change in the redesign is JavaScript/JSX/styles, no native
code. Push those changes to the preview channel only:

```bash
eas update --branch preview --message "Phase 1 — brand tokens + typography"
```

The preview build picks the update up next launch. Production is untouched
because production builds only consume updates from the `production` channel.

When you're ready to ship the redesign to real users:

```bash
eas update --branch production --message "v1.1 — full visual refresh"
```

That's the one command that affects production. Be intentional.

## Branch ↔ channel mapping (recommended)

| Git branch             | Use case                                  | Push updates to channel |
| ---------------------- | ----------------------------------------- | ----------------------- |
| `master`               | Stable, matches what's in production      | `production`            |
| `redesign/site-match`  | Active redesign work                      | `preview`               |

You can have multiple feature branches all pointing at `preview` — they just
take turns being "the latest preview."

## Rolling back

If a production update breaks something:

```bash
eas update:rollback --branch production
```

EAS keeps the previous update available; this restores it.

If something deeper goes wrong (native code or schema):

```bash
git checkout pre-redesign-backup-2026-06-02
```

Restores the pre-redesign state of the repo. Then rebuild from there.
