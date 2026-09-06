# The Tani Journal

## Vercel setup

The complete variable template is in [.env.example](.env.example). Add the values in Vercel under **Project -> Settings -> Environment Variables**. Add production, preview, and development values as needed, then redeploy after changing variables.

### 1. Add the database

Create a PostgreSQL database with Neon, Supabase, or Vercel Postgres and add its pooled connection string as `DATABASE_URL`. Run the first migration from a machine that can reach the database:

```bash
DATABASE_URL="your-postgres-url" yarn prisma migrate deploy
```

### 2. Generate private secrets

Run these locally and paste the output into Vercel. Never commit the generated values:

```bash
openssl rand -base64 32 # AUTH_SECRET
openssl rand -base64 32 # TOKEN_ENCRYPTION_KEY
```

`TOKEN_ENCRYPTION_KEY` must decode to exactly 32 bytes. It encrypts Google Drive tokens stored in PostgreSQL.

### 3. Configure Google OAuth and Drive

Create a **Web application** OAuth client in Google Cloud Console. Set:

- Authorized JavaScript origin: `https://YOUR-VERCEL-DOMAIN`
- Authorized redirect URI: `https://YOUR-VERCEL-DOMAIN/api/auth/callback/google`

Add the OAuth client ID to `AUTH_GOOGLE_ID` and the client secret to `AUTH_GOOGLE_SECRET`. Configure the consent screen and request the Drive scope used by the app: `https://www.googleapis.com/auth/drive.file`. During testing, add the Google accounts that will sign in as test users.

### 4. Add the current migration variables

The existing home experience still uses Firebase and the legacy Mongo API, so the following must remain configured until that migration is complete:

- `MONGO_URL`
- `DB_NAME`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

These Firebase values come from Firebase Console -> Project settings -> Your apps -> Web app. For Firebase Google sign-in, add the Vercel domain under Authentication -> Settings -> Authorized domains.

### 5. Host chat separately

Vercel cannot keep the Socket.IO process alive inside a serverless function. Deploy `server/index.js` to a long-running Node host such as Render, Railway, Fly.io, or a VPS:

```bash
yarn install --frozen-lockfile
yarn dev:chat
```

Set `CHAT_PORT` on that host if required, set `CORS_ORIGINS` there to the Vercel URL, and set Vercel's `NEXT_PUBLIC_SOCKET_URL` to the chat server's public HTTPS URL. The chat service also needs access to the repository's Socket.IO dependencies.

### 6. Deploy

Import the repository into Vercel with:

- Framework preset: **Next.js**
- Build command: `yarn build`
- Install command: `yarn install --frozen-lockfile`

After deployment, test `/auth/signup`, `/auth/signin`, `/write`, `/stories`, and `/api/auth/providers`. Google Drive publishing requires a real Google OAuth login and a configured `DATABASE_URL`; local credentials signup alone does not create Drive storage.