# Chess Trainer Mobile

React Native iOS client for Chess Repertoire Trainer, built with Expo Router and TanStack Query.

## Run locally

From the repository root:

```bash
npm install
npm run dev:api
npm run ios:mobile
```

In the mobile app, open Settings and set the API base URL:

```txt
http://localhost:3000/api
```

Use `http://127.0.0.1:3000/api` if the simulator cannot reach `localhost`. Physical iPhones need the Mac LAN IP, for example `http://192.168.1.20:3000/api`.

## Implemented areas

- Study library with course/chapter/line drill-down.
- Course, chapter, and line management.
- Line training with WebView board adapter and backend session API.
- Line editor with move tree, notes, subtree deletion, and backend position analysis.
- Review stats and weakest line cards.
- Imported games explorer and game replay.
- Personal opening analysis with rated-only backend queries.
- Settings for API URL, health check, and build info.

Accounts and Lab are intentionally out of scope for this first mobile client.

## Distribution

See [docs/mobile-download.md](docs/mobile-download.md) for simulator, development build, internal distribution, and TestFlight instructions.
