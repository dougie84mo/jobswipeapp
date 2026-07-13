# Dev client setup & run guide

How to install and run the **Recruit Swipe** development client on a physical
Android phone (ready now) and a physical iPhone (needs one build + an Apple
Developer account). The dev client replaces Expo Go so real push delivery,
Stripe return deep-links, and custom native gesture code work.

## Facts

- EAS project: `@jdfan/recruit-swipe` (owner `jdfan`)
- App scheme: `recruitswipe://` · package/bundle id: `com.recruitswipe.app`
- Dev build EAS channel: `development` (see `eas.json` → `build.development`)
- **Android dev build: already built** — build `2ae601fd-6f6e-40ea-b60a-fa16fd6f8ce4`,
  SDK 54, APK ~200 MB. Page:
  https://expo.dev/accounts/jdfan/projects/recruit-swipe/builds/2ae601fd-6f6e-40ea-b60a-fa16fd6f8ce4
- iOS dev build: **none yet**.

**Key idea:** you install the dev client (the native app) once per native
change. Day-to-day JavaScript edits reload over Metro — no rebuild. Rebuild the
dev client only when native deps, config plugins, the app scheme, or app.json
native config change.

---

## A. Android (physical phone) — do this now

### 1. Install the APK on the phone

**Option 1 — download link (no cables, easiest):**
1. On the **phone**, open the build page above (email it to yourself or open
   in the phone browser).
2. Tap **Install** → it downloads the `.apk`.
3. Open the downloaded file. Android will ask to **allow installing unknown
   apps** for your browser/Files app — allow it, then **Install**.
4. "Recruit Swipe" (with a dev-client badge) appears in your app drawer.

**Option 2 — USB + adb (if you prefer cable installs / faster iteration):**
Requires Android platform-tools locally (not currently installed on this PC).
Once set up and the phone is in USB debugging mode:
```bash
eas build:run -p android   # pick the development build, installs to device
```

### 2. Start the bundler on the PC

```bash
npx expo start --dev-client
```

Leave this running. It prints a QR code and an `exp://<your-lan-ip>:8081` URL.

### 3. Connect the phone to the bundler

- Put phone + PC on the **same Wi-Fi**.
- Open the **Recruit Swipe** dev-client app → the dev launcher screen.
- It should list your running server under **Development servers**; tap it.
  Or **scan the QR** from the terminal, or **Enter URL manually** with the
  `exp://…` URL Metro printed.

**If it can't reach the server** (guest/corporate Wi-Fi often isolates
clients), use a tunnel:
```bash
npx expo start --dev-client --tunnel
```
(Expo will offer to install `@expo/ngrok` the first time.)

---

## B. iPhone (physical) — later, from the Mac or here

A dev client on a **physical** iPhone needs a provisioning profile that
includes the device's UDID, which requires an **enrolled Apple Developer
account** ($99/yr). (An iOS *simulator* build needs only a Mac + Xcode, no
paid account — but you're targeting a physical iPhone.)

### 1. Register the iPhone with EAS
```bash
eas device:create
```
Follow the URL/QR on the iPhone to install a registration profile — this
records the device UDID with Apple.

### 2. Build the iOS dev client
```bash
eas build -p ios --profile development
```
EAS will prompt to sign in to Apple and will create the signing credentials
for you (internal / ad-hoc distribution). Wait for the build to finish
(email + build page link).

### 3. Install on the iPhone
Open the finished build's page/link **on the iPhone** → **Install** → trust
the profile if prompted (Settings → General → VPN & Device Management).

### 4. Connect to the bundler
Same as Android step 2–3: `npx expo start --dev-client`, open the Recruit
Swipe dev client, pick/scan your server.

> TestFlight alternative: `eas build -p ios --profile development --auto-submit`
> distributes via TestFlight instead of ad-hoc. Adds Apple processing latency;
> ad-hoc internal install is faster for day-to-day dev.

---

## When to rebuild the dev client

Rebuild (`eas build --profile development -p <platform>`) only when the
**native** layer changes:
- add/remove a native module or config plugin
- change `app.json` native config (scheme, permissions, icons/splash native bits)
- bump Expo SDK

Pure JS/TS/asset changes never need a rebuild — save and Metro fast-refreshes.

## Still pending (not required to run the dev client)

- **Push credentials** for real delivery: Android needs `google-services.json`
  + an FCM v1 service-account key; iOS needs an APNs key (via `eas credentials`).
  The dev client runs fine without these — only remote push won't deliver yet.
