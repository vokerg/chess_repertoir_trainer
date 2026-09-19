# Chessground mobile Phase 0 spike

> Historical status: this feasibility harness led to the supported `apps/mobile` workspace. Current mobile setup, persistence, synchronization, and training behavior are documented in [`../../docs/mobile/architecture.md`](../../docs/mobile/architecture.md) and [`../../docs/mobile/development.md`](../../docs/mobile/development.md).

This is an isolated Expo feasibility harness for the native-mobile rollout. It proved the highest-risk requirement: running the actual `@lichess-org/chessground` package with acceptable physical-device interaction and fully local assets.

It is intentionally **not** an npm workspace and must not be installed from the repository root. The supported product client now lives in `apps/mobile`; this directory remains a historical board-integration and manual-test reference.

## What is included

- Expo SDK 54 baseline, selected so the App Store Expo Go build used during the spike could run the physical-iPhone smoke test.
- Actual `@lichess-org/chessground@10.1.0`.
- Official Chessground base CSS and Cburnett piece CSS.
- Walnut theme values copied into neutral DOM CSS.
- Legal destinations from `chess.js`.
- Drag and tap movement.
- White and black orientation.
- Last move, check, selected square, legal destinations, and arrows.
- Board-local queen, rook, bishop, and knight promotion picker.
- Native accept/reject boundary with authoritative snapback.
- External move and rapid update controls.
- Initialization, event, duplicate, and error diagnostics.
- A native `ScrollView` around the board for gesture-conflict testing.

## Install

Use Node 22.13 or newer.

If this spike was previously installed with SDK 57, remove the old dependency tree and lockfile first.

macOS/Linux:

```bash
cd spikes/mobile-chessground
rm -rf node_modules package-lock.json
npm install
npm run typecheck
```

Windows PowerShell:

```powershell
cd spikes/mobile-chessground
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
npm run typecheck
```

## Run on a physical phone

Start Metro with a clean cache:

```bash
npx expo start -c
```

Then scan the QR code with the compatible Expo client used for the spike, or open it from the Android Expo client.

The phone and development machine must be able to reach each other over the local network. Use Expo tunnel mode when LAN discovery is blocked:

```bash
npx expo start --tunnel -c
```

## Other run targets

```bash
npm run ios
npm run android
npm run web
```

`npm run ios` requires macOS and Xcode. A physical iPhone smoke test through Expo Go does not.

## Release/offline validation

Expo Go was only the first interaction smoke test. The Phase 0 offline gate used standalone release builds:

```bash
npx expo run:android --variant release
npx expo run:ios --configuration Release
```

After installation, terminate the app, enable airplane mode, and launch it again. The board, pieces, scenarios, promotion picker, and diagnostics must work without Metro or network access.

For current product release gates, use [`../../docs/mobile/development.md`](../../docs/mobile/development.md), not this historical checklist alone.

## Test artifacts

- `docs/manual-test-checklist.md`
- `docs/device-matrix.md`
- `docs/results-template.md`
- `docs/licensing-decision.md`
- `THIRD_PARTY_NOTICES.md`

## Isolation rules

Do not add this directory to the repository root workspaces. Do not use it as the source of current mobile product behavior. Changes to the supported client belong under `apps/mobile` and the shared packages/API it consumes.

## Known Phase 0 limitations

- This is a feasibility harness, not the supported product client.
- Its Expo baseline and install notes describe the spike environment, not the current workspace contract.
- It does not include authentication, API integration, persistence, synchronization, or the offline training reducer.
- GPL compatibility and production distribution acceptance remain tracked as release gates for the supported client.
