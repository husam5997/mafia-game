# MAFIA — Comic Noir v1.1 (playable multiplayer web app)

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
- **Exit to Main Menu** in every room/game phase, including the lobby, nighttime, and game over. Confirm before permanently leaving.
- Host can **KICK** players (including offline/ghost participants) from the lobby before each match and after **Play Again**. Kicked phones automatically return to the main menu on their next server check.
- Player connection indicator in lobby (online / disconnected, ~12 seconds after last heartbeat).
- If the host leaves, hosting rights transfer automatically to an active participant; exiting during a match counts as leaving/elimination, without revealing the role.
- Host-only emergency **End Match & Return Everyone to Lobby** action when a game gets stuck, allowing inactive players to be removed before restarting.
- Role reveal also has a 120-second automatic fallback, preventing an unresponsive player from blocking the game indefinitely.
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

## Leaving, kicking, and recovering a stuck match (v1.1)

- **To leave yourself:** press **EXIT TO MENU** in the header, confirm, and you immediately return to the homepage. Your server session is invalidated; you can create a different room or join somebody else's room. If you leave mid-match, you forfeit your role (treated as eliminated); your role stays secret until the eventual game-over reveal. If you were the host, another still-in-room player becomes host.
- **To remove an inactive player before starting:** the host clicks **KICK** underneath the player's avatar in the lobby and confirms. The player is removed from the room, and their old room session no longer works.
- **After a match:** the host can select **PLAY AGAIN — SAME CREW** to return everyone to the lobby. Players who explicitly left are removed, and the host can kick any offline/ghost player before starting the next match. Anyone can also choose **EXIT TO MENU** to create or join another room.
- **When a match is stuck:** the current host can use **END MATCH & RETURN EVERYONE TO LOBBY** (available during any active phase). This cancels the current match for all participants, without preserving its roles/results, and allows roster cleanup.
- **If someone merely closes their browser:** closing a tab cannot reliably distinguish a permanent departure from a temporary network loss or refresh. We therefore do *not* auto-kick them. The lobby marks them disconnected after roughly 12 seconds; the host can kick them. In active games, timers still expire, and the initial private role-reveal stage auto-advances after 2 minutes.
- **Offline exit caveat:** if the internet is down when you press Exit, your phone still returns to the homepage. The app attempts to notify the server, but cannot guarantee that the server received the exit; the host can remove your old disconnected slot from the lobby.

On free hosts such as Render, **a restart/redeploy clears all rooms** because they are held only in server memory. Share the new version by replacing the app files in your Node.js service repository and redeploying.
