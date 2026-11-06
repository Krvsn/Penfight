# Pen Fight 5

A real-time browser multiplayer pen-flicking game for 2–5 remote players. Inspired by the traditional classroom game; original implementation.

## Run locally

1. Install Node.js 18 or later.
2. In this folder, run `npm install`.
3. Run `npm start`.
4. Open http://localhost:3000.

## Play remotely

Deploy the entire folder to a Node.js hosting service such as Render, Railway, or Fly.io. Use `npm install` as the build command and `npm start` as the start command. Your service must support WebSockets. Share the resulting public URL, create a room, and send friends the invite link. The server holds room state in memory; restarting the server clears active rooms. For multiple server instances, add a shared store and Socket.IO adapter.

## Rules

2–5 players; the host starts. Each player drags from their pen and releases to flick. Server simulates motion and collisions, broadcasts animation frames, and advances turns. Pens that cross the board edge are eliminated; last remaining pen wins. Host can start another round.

## Notes

This is a playable prototype. Physics use simplified circular collision envelopes around drawn pens, not precise rigid-body pen geometry. Room codes are not authenticated and matches have no reconnect persistence.
