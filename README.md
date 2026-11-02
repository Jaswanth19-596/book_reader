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

## Supabase setup — shared library, no sign-in

The browser connects directly to Supabase with the public project URL and publishable key. Every page load fetches the shared saved selections. No email, password, auth session, or redirect configuration is needed.

1. In the Supabase SQL Editor, run `supabase/shared-selections.sql`. This creates the shared library and copies existing account selections into it without deleting the originals. Running it again does not overwrite shared selections.
2. Public project credentials are in `public/supabase-config.js`. Deployments can override them with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (or the `NEXT_PUBLIC_` versions). Never supply a secret/service-role key to the browser configuration.
3. Open the reader. Selections load automatically. **Cloud storage → Refresh selections** fetches changes from other browsers.

Anyone with access to this public app can read, add, archive, and restore shared selections. Permanent deletion and editing existing selection content are not granted to the browser. Removed selections remain available in **Recently removed**.

Use **Import browser data** to copy any surviving localStorage selections. The original browser copy is retained. **Download cloud backup** exports active and removed selections; **Import backup** adds missing items without replacing existing ones. Keep an independent backup regularly.

Saves require internet access and are confirmed only after the server responds. There is no offline save queue. Already-erased browser data cannot be recreated without a backup.

The OpenCode API key remains a separate browser setting and is not included in Supabase or backup exports. PDFs and reading position are not saved yet. PDF.js and the Supabase client load from CDNs.

`supabase/schema.sql` is the previous account-based schema, retained for reference. Use `supabase/shared-selections.sql` for the current app.

This project is ready for your own deployment; it does not change the existing ChatGPT-hosted site or its access settings. Netlify access settings are separate; the source code does not include ChatGPT login.

## Checks

```sh
npm run check
npm test
```

Tests use a fake key and mocked provider responses. They do not call OpenCode or spend API credits.

References: [Netlify Functions](https://docs.netlify.com/build/functions/get-started/), [browser localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Supabase references: [email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
