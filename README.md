# Folio book reader

A PDF reader with continuous scrolling and contextual explanations of words, sentences, and paragraphs. This standalone version deploys to Netlify from GitHub.

## Run on your computer

Install Node.js 22 or newer, open this folder in a terminal, and run:

```sh
npm run dev
```

Open http://localhost:4173. There are no dependencies to install. The local server includes the explanation endpoint; opening index.html directly or using a static-only server does not.

## Deploy through GitHub and Netlify

1. Push the contents of this folder to your GitHub repository.
2. In Netlify, import that repository as a project.
3. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `public`, functions directory `netlify/functions`.
4. Open the deployed address. Under **Connection**, enter your OpenCode Go API key, leave **Remember on this device** checked, select a model, and choose **Save connection**.

No API key belongs in the repository or in the Netlify configuration. Every visitor supplies their own key. The server function forwards it to OpenCode for explanation requests and does not save it. Existing OpenCode model names and provider behavior have been preserved from the original reader.

## Supabase setup

Saved selections now belong to a signed-in Supabase account. Cloud setup is required before saving new selections; the app never silently falls back to localStorage.

1. Create a Supabase project named `folio-book-reader`. Choose a nearby region and keep its database password private.
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it. This creates `folio_selections` and per-account access policies. No manual columns are needed. The script is safe to run again.
3. Copy the **Project URL** and **Publishable key** from the project's Connect dialog / API settings. Legacy `anon` keys are also supported. Never use a secret or `service_role` key.
4. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in your Netlify build environment. For local use, set these environment variables before `npm run dev`, or enter the public values in `public/supabase-config.js`. The build/dev configuration script writes these public credentials into the browser configuration. Redeploy or restart after changing them. No `.env` loader is installed.
5. In Supabase **Authentication → URL Configuration**, set **Site URL** to your deployed reader URL and add your exact deployed URL and `http://localhost:4173/` to **Redirect URLs**. Enable the Email provider. For emails beyond Supabase's test-mail restrictions, configure your own SMTP provider in Authentication settings.
6. Open **Cloud storage**, enter your email and request a sign-in link. Open the emailed link, then use the same email on every device.
7. Choose **Import browser data** to copy surviving old selections into the signed-in account. Repeat from each original browser/address that holds data. Imports keep the original browser copy and never overwrite existing cloud content. If an import is interrupted, retry it; duplicate selections are ignored.

### Storage and recovery

- Saved words, sentences, paragraphs and their explanations live in Supabase. Clearing browser storage may sign you out, but signing in again reloads your selections.
- Saves require internet access and are only confirmed after the server responds. If an action fails, keep the selection open and retry. There is no offline save queue.
- Removing a selection archives it. Open **Cloud storage → Recently removed** to restore it. The app's database permissions prevent permanent deletes and content overwrites.
- Use **Download cloud backup** regularly and keep the JSON file on another drive or cloud storage. It includes active and removed selections. **Import backup** adds missing items; existing removed items remain in Recently removed until restored. This is a manual independent backup, not an automatic off-site backup service.
- **Download old browser data** works even before Supabase is configured. Already-erased browser data cannot be recreated by this migration; check the original address/browser profile or an existing backup.
- Supabase authentication sessions and the OpenCode API key still use browser storage. The OpenCode key stays out of the cloud selections database and backup files. It is unencrypted in the browser when Remember is enabled. Forget connection removes it.
- PDFs and reading position are not saved yet. Open your PDF each time. PDF rendering is local; explanation requests send only the selection and short surrounding excerpt. PDF.js and the Supabase client load from CDNs and require internet access.
- Account deletion in Supabase deletes that account's selections. Cloud storage does not replace independent backups.

### Verify database access before deployment

With two test accounts, save a selection as account A. Account B must not see or update A's row, including when directly requesting its ID; signed-out requests must not read or write rows. Attempted permanent deletion and payload updates must be denied. Reopen the app after clearing its browser storage, sign back in as A, and verify the selection returns. Live authentication and access-policy checks require a configured Supabase project; local unit tests mock database responses.

This project is ready for your own deployment; it does not change the existing ChatGPT-hosted site or its access settings. Netlify access settings are separate; the source code does not include ChatGPT login.

## Checks

```sh
npm run check
npm test
```

Tests use a fake key and mocked provider responses. They do not call OpenCode or spend API credits.

References: [Netlify Functions](https://docs.netlify.com/build/functions/get-started/), [browser localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Supabase references: [email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
