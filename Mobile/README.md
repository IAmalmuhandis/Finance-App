# Arzo (mobile)

Expo client for **Arzo** — same account and saved entries as the Next.js web app. Screens: **Calculator** and **Progress**.

## Setup

1. Copy `env.example` to `.env` in this folder.
2. Set `EXPO_PUBLIC_API_BASE_URL` to your Arzo server (LAN IP for local dev, e.g. `http://192.168.1.10:3000`).
3. From the repo root, start the web server: `npm run dev`.
4. In this folder:

```bash
npm install
npx expo start --clear
```

Scan the QR code with **Expo Go** on the same Wi-Fi network.

## Google sign-in (optional)

- Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to match `GOOGLE_CLIENT_ID` on the server.
- Add `https://auth.expo.io/@anonymous/arzo` to your Google OAuth Web client's redirect URIs.
- Server needs `NEXTAUTH_SECRET` and Google OAuth env vars.

## Features

- Sign in / sign up (email + password, optional Google)
- **Calculator** — recommended or custom nested split, save entries
- **Progress** — wealth retained, totals, per-bucket breakdown, history

Data syncs via `/api/entries` on the same MongoDB backend as the web app.
