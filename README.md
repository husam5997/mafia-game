# Mafia Lobby — v1.3.1

**By Barely Chaos** · Website: https://mafialobby.com.ly · Patreon: https://www.patreon.com/cw/BarelyChaos

This release was built directly from **Mafia Comic Noir v1.1**. It does **not** use the scrapped v1.2 codebase. The multiplayer gameplay, host kicks, leaving a room, host succession, emergency match cancellation, and replay features from v1.1 are retained.

## Quick start

Requires Node.js 18 or newer. There are no external npm dependencies.

```bash
npm start
```

Open `http://localhost:3000`. Multiple players must connect to the same deployed server to join the same room; `localhost` on different phones is not a shared server.

Check version at `http://localhost:3000/api/version` (or `https://mafialobby.com.ly/api/version`). It should report `1.3.1`.

## What's new in v1.3

- Product branding: **Mafia Lobby**, **by Barely Chaos**, with Comic Noir as the *art style* only.
- Patreon support buttons on the menu, plus a support prompt after 30 minutes of cumulative visible use. It can recur no sooner than another 30 minutes of visible use, and **only** on the home, rules, join, waiting-lobby or game-over screens. It never interrupts role reveal, night actions, daytime discussion, voting, or results.
- Per-player language dropdown for English, Arabic (RTL), French and Spanish. Language is saved locally on each player's device; chat messages and names are not machine-translated.
- Host capacity dropdown: values 5 through 25. Its top-of-lobby display previews the selection immediately; use **Save Settings** to persist and synchronize the new capacity with other players.
- Live equivalent duration labels for night, discussion and voting inputs (e.g., 125 seconds = 2 min 5 sec).
- Favicon, Apple touch icon, manifest, 1200×630 Open Graph/WhatsApp share image, SEO title and description, canonical URL, sitemap, robots.txt and basic search-engine-readable homepage content.
- Main-menu Report a Bug form with category, description, optional reply email and browser/version context, **connected to Formspree**.
- Discreet `v1.3.1` in the bottom footer.

## Formspree bug reporting — configured

The **Report a Bug** form is already connected to your Formspree form:

- Endpoint: `https://formspree.io/f/xjyydrbj`
- The public form ID is configured in `public/config.js`.
- The existing frontend submits with browser `fetch()` (Vanilla JavaScript AJAX) and `Accept: application/json`; **no React, Formspree SDK, extra npm dependency, or Node.js server changes** are necessary.
- The form includes a category, required explanation, optional reply email, honeypot field, and game/browser/version metadata. Private roles and room session tokens are never sent.
- The interface displays a success message **only after Formspree responds successfully** and keeps the form available on failure.

**Finish setup:** In your Formspree dashboard, verify the form's destination email, make sure notifications are enabled, and check spam/junk folders. After deploying, submit a test report using the website and verify receipt in both the Formspree dashboard and your inbox. The included tests simulate Formspree; they do not send real reports.

The Formspree form ID is public configuration and is safe to include in client-side code. It does not grant access to your account. No bug reports are saved as local server files.

## Custom domain, SEO and social sharing

All canonical and social share URLs point to `https://mafialobby.com.ly/`.

- You **must still connect this domain to your Render service** using Render's Custom Domains workflow and the DNS records required by Render in your domain registrar (Libyan Spider). Buying the domain alone is not enough.
- Verify `https://mafialobby.com.ly/social-preview.jpg` publicly returns the image. WhatsApp and other platforms cache previews; a previously shared link may take time to refresh.
- Verify `https://mafialobby.com.ly/robots.txt` and `https://mafialobby.com.ly/sitemap.xml` work publicly.
- Add and verify your domain at https://search.google.com/search-console, then submit `https://mafialobby.com.ly/sitemap.xml` and optionally request indexing for your homepage. This **helps discovery but does not guarantee Google ranking or indexing**.
- **Render Free warning:** when a free web service spins down after inactivity, Render can serve a `Disallow: /` response to `/robots.txt` while sleeping, which can impede indexing. For reliable discoverability, use an always-available landing page or paid/always-on hosting as the project grows. See https://render.com/docs/free.

## Updating GitHub / Render correctly

**Extract the ZIP and upload its contents at the repository root**, not inside another folder. The root of this ZIP contains `server.js`, `package.json`, `README.md`, and `public/`. Do not upload just the ZIP to GitHub as a file. Replace the old `public` folder as well as old root files, then commit.

Render Web Service settings:

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Instance type: Free for testing

Then check `https://YOUR-RENDER-URL/api/version` returns `1.3.1`, the site footer says `v1.3.1`, and perform a hard refresh after a redeploy.

This server stores game state in memory. Render restarts, scale changes, and idle spin-downs wipe active rooms. Persistent rooms and longer-term production hosting require an external data store.

## Source tree

```
package.json
server.js                 Node.js HTTP game server (v1.1 gameplay retained)
public/
  index.html              Search/social metadata, crawlable homepage intro
  app.js                  UI, game actions, language switching, timed support, bug form
  i18n.js                 EN/AR/FR/ES interface translations
  config.js               Formspree Form ID setting
  styles.css              Comic Noir visual styling and responsive layouts
  social-preview.jpg      WhatsApp/Open Graph preview (1200×630)
  favicon.svg             Main brand icon
  favicon-32.png          Small favicon
  favicon-180.png         Apple touch icon
  favicon-192.png         Android icon
  favicon-512.png         High-resolution icon
  site.webmanifest
  sitemap.xml
  robots.txt
```

## Test checklist

- Host creates a room, another device joins, host changes capacity and saves; both devices show the saved value.
- Host kicks an inactive player before starting a game; they return to the menu and their old session cannot rejoin.
- Test language switching on separate devices **in the same room**, including Arabic RTL.
- Change night seconds to 125 and confirm the display says 2 min 5 sec.
- Complete a Mafia vote, Doctor protection and Detective investigation, finish a day, then use Play Again.
- Exit to main menu as both host and joining player.
- Configure Formspree, send a bug report and verify delivery.
- Keep the page visible for 30 minutes and verify the support prompt appears in a safe phase, not during voting or nighttime.
- Verify the browser favicon, WhatsApp preview and public sitemap on the final custom domain.
