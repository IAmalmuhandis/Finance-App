# Vaultly (mobile)

Mobile client for **Vaultly** — same account and data as the Next.js web app (Dashboard, transactions, formula tracker). Built with React Native and Expo.

## Prerequisites

- Node.js (20+ recommended for this toolchain)
- **Expo Go** from the App Store / Play Store — this project targets **Expo SDK 54**, so your Expo Go app must be the current SDK 54 build (same major as `expo` in `package.json`).

## Getting Started

1. Navigate to the Mobile folder:
   ```bash
   cd Mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   If npm fails on peer dependency resolution, use:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **API URL (required once per machine):** the app does not ask for a server on screen. Create a file `Mobile/.env` with your Next.js base URL (use your PC’s LAN IP on a real phone, not `localhost`):

   ```
   EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000
   ```

   Then start Expo (env is picked up on restart):

   ```bash
   npx expo start
   ```

4. Open the app: sign in or **Sign up** to create an account (same as web registration). Data uses your deployed Next.js API and MongoDB.

5. Scan the QR code with Expo Go, or use a simulator.

## Features

- **Formula Calculator**: Real-time income allocation based on customizable percentages.
- **Formula Editor**: Customize your savings and spending rules.
- **Weekly Check-in**: Track your financial habits weekly.
- **Monthly Log**: Keep a detailed history of your investments and savings.
- **Persistence**: Local copy on the device (AsyncStorage), with optional cloud sync to the same MongoDB-backed `/api/tracker` used by the web app after you sign in.
