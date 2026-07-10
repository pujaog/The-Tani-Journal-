# Tani-Journal

A quiet journaling experience focused on thoughtful writing, mood-rich entries, and media-backed memory keeping.

## Latest update

- Refined landing page and sign-in copy with a stronger focus on quiet reflection.
- Added the new highlight: "Write what you cannot say aloud."

## Deployment checklist (Vercel)

If Google sign-in, Drive connect, or saving/publishing fail after deployment, verify these items:

- **Environment variables** (set in Vercel Dashboard → Project → Settings → Environment Variables):
	- `MONGO_URL` (MongoDB Atlas connection string)
	- `NEXT_PUBLIC_FIREBASE_API_KEY`
	- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
	- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
	- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
	- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
	- `NEXT_PUBLIC_FIREBASE_APP_ID`
	- (optional) `ADMIN_EMAILS`, `CORS_ORIGINS`

- **Firebase Console**
	- In **Authentication → Sign-in method**, enable **Google** provider.
	- Add your Vercel domain to **Authentication → Authorized domains** (e.g. your-app.vercel.app).

- **Google Cloud / OAuth Consent**
	- If using Google Drive scopes, ensure the OAuth consent screen is configured and the app is published (or testing users are added).
	- In **Credentials → OAuth 2.0 Client IDs**, ensure the **Authorized JavaScript origins** and **Authorized redirect URIs** include your Vercel domain. For Firebase sign-in with redirect/popup, add `https://your-app.vercel.app` and any subpaths required.

- **Vercel serverless function limits**
	- The API uses serverless functions; ensure `vercel.json` has adequate `maxDuration` for heavy Drive operations (already configured in repository).

- **Quick runtime checks**
	- The client will log missing NEXT_PUBLIC_ variables to the console and set `window.__TANI_ENV_MISSING__` so the UI can surface a banner. Check browser console for `Tani: missing required env vars:` messages.

If you'd like, I can:
- Inspect your Vercel environment settings, or
- Add a visible banner in the app UI that lists missing env vars, or
- Walk through a fresh deployment to Vercel step-by-step.