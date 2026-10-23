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

## What is remembered

- The API key and selected model are saved in browser localStorage when **Remember on this device** is checked. Reloading or reopening the same address in the same browser profile restores the connection.
- **Forget connection** removes that saved key and clears the active connection. Unchecking **Remember on this device** removes the saved key and keeps the active connection only until this page closes.
- Saved selections are stored in the same browser, as in the original reader.
- The key is stored unencrypted and can be read by anyone with access to that browser profile or by scripts running on this site. Use a browser profile you control.
- Storage belongs to the website address and browser profile. The ChatGPT-hosted site, a new Netlify domain, and localhost each have separate storage. Moving between them requires entering the key once at each address. Private browsing, clearing site data, or blocking browser storage can prevent persistence. Data does not sync between devices.
- PDFs and reading position are not saved between visits. Open your PDF each time. The PDF is rendered locally; explanation requests send only your selected text and a short excerpt. PDF rendering loads PDF.js from Cloudflare's CDN and needs an internet connection.

This project is ready for your own deployment; it does not change the existing ChatGPT-hosted site or its access settings. Netlify access settings are separate; the source code does not include ChatGPT login.

## Checks

```sh
npm run check
npm test
```

Tests use a fake key and mocked provider responses. They do not call OpenCode or spend API credits.

References: [Netlify Functions](https://docs.netlify.com/build/functions/get-started/), [browser localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
