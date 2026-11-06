# MAFIA — Comic Noir (playable multiplayer web app)

A mobile-first, English-language, face-to-face Mafia game. Real game state and role secrecy are handled by a Node.js server, not by each player's browser. No third-party npm packages are required.

## Run it

1. Install **Node.js 18 or newer**.
2. Open a terminal inside this folder.
3. Run `npm start` (or `node server.js`).
4. On the computer running the server, open `http://localhost:3000`.
5. To play on different phones, **deploy this application to a public HTTPS host that supports long-running Node.js services**, and share its URL. Alternatively, on the same Wi-Fi network, use `http://YOUR_COMPUTER_LAN_IP:3000` (firewall access may be needed). Some browser features such as copy-to-clipboard require HTTPS or localhost.

This is a Node.js server application. **Static hosting such as a plain Netlify drag-and-drop static site will NOT run multiplayer rooms.** A platform that runs the Node server is required. `PORT` is honored automatically.

## What's included

- Landing menu: Host Game, Join Game, Rules
- 6-character room codes; 5–25-player capacity
- In-browser layered cartoon avatar editor with saved local preferences
- Host-controlled roles and timers, editable until the game starts
- Private role reveal, randomized role distribution, and participant host
- Mafia live target picks, unanimous kill confirmation, private chat, 30-second deadline extension
- Independent Doctors, repeat-protection restriction, immediate Detective investigations, harmless Civilian sheep mini-game
- Private simultaneous night actions and public daytime announcements with comedic scenarios
- Adjustable daytime discussion with unanimous early-finish voting
- Strict >50% of surviving players required for elimination; no majority = no elimination
- Public reveal of who voted for whom AFTER voting
- No role reveal until game over; victory screens, history, and Play Again keeping the same avatars
- Poll-based room synchronization (about 1.3 seconds) without external dependencies

## Important production limitations

This is a **first playable build**, not a production-hardened internet service:

- Rooms are stored **in process memory**, so restarting or redeploying the server loses games. Use a database/shared persistence before serious public use.
- No authentication, bot/abuse protection, room expiry, moderation, metrics, or automated scaling.
- A user's private reconnect token is stored in that browser's localStorage. Don't share your browser's storage data. Loss of the browser session means loss of that player's in-progress role.
- The default server has no rate limiting, so place it behind suitable protections before opening it publicly.
- UI uses lightweight HTTP polling rather than WebSockets. It is suitable for small rooms and development; WebSockets and multi-instance coordination are recommended for production.
- The Comic Noir art is code-drawn original SVG avatar components plus CSS; it can be enriched later with a professional illustration set.
- There is no built-in QR creator or pause mechanism yet. Room-code sharing works.
- Some animations are illustrative rather than cinematic, and short audio effects have not yet been added.
- No automated browser/device accessibility test suite yet.

## Typical development flow

`public/index.html` is the page shell, `public/styles.css` defines the Comic Noir design system, `public/app.js` renders screens and handles user actions, and `server.js` validates every game action and owns secret roles, voting and timers.
