# Arzo

**Arzo** is a wealth split calculator with user accounts and per-user progress tracking. Tagline: *Give every naira a job.* Enter gross income in Nigerian Naira (₦), split it using a recommended formula or a custom nested tree, save entries, and track wealth retained over time.

## Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4
- **Database:** MongoDB via Mongoose
- **Auth:** NextAuth (email/password + optional Google OAuth), JWT sessions

## Screens

1. **Sign in / Sign up** — `/`
2. **Calculator** — `/calculator` (protected)
3. **Progress** — `/progress` (protected)

## Local development

```bash
# Start MongoDB (optional — uses Docker Compose)
npm run db:up

# Copy env and set secrets
cp .env.example .env.local   # or .env in frontend if you prefer

# Install and run
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Mobile (Expo Go)

See [Mobile/README.md](Mobile/README.md). Set `EXPO_PUBLIC_API_BASE_URL` in `Mobile/.env` to your server (LAN IP for local testing), then:

```bash
cd Mobile
npm install
npx expo start --clear
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` or `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DIRECT_URI` | No | Standard `mongodb://` URI if SRV fails |
| `NEXTAUTH_URL` | Yes | App origin (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing |
| `GOOGLE_CLIENT_ID` | No | Google OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |

## Build

```bash
npm run build
npm start
```
