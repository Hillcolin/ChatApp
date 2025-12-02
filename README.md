# ChatApp (Firestore + ReactJS)

```bash
cd ChatApp
npm install
# ChatApp (Firestore + ReactJS)

Quick start

```bash
cd ChatApp
npm install
```

Run the dev server:

```bash
npm run dev
```

Notes

- This is a lightweight Vite + React scaffold. It demonstrates:
  - Firestore real-time listeners (`onSnapshot`)
  - Adding messages with server timestamp
  - Simple message input and message list components
- For production you should secure Firestore with proper rules (require auth, etc.).
- If you want full authentication, enable Firebase Auth and update `src/firebase.js` and the UI.
 - Authentication: this scaffold now includes Firebase Auth (Google sign-in).
  - Enable Google provider in your Firebase Console if you want Google sign-in to work.
  - Firestore rules should be tightened to require authenticated users for writes in production.

UI / Styling

- The app uses a Discord-like dark theme with a left channel sidebar, main chat area, and a message input bar at the bottom.
- Create channels in the sidebar and click a channel to join it. Messages are scoped per-channel in Firestore (each message has a `channel` field).

Development notes

- For local testing of security rules, use the Firebase Emulator Suite and connect the client to the local emulator.

Security reminder

- The app uses Firebase Auth; make sure Firestore rules require authenticated access for writes in production.

Enjoy! Feel free to ask for extra features like presence, reactions, threads, or message editing.
