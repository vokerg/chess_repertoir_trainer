# Mobile Download And Distribution

## A. Local iOS Simulator

```bash
npm install
npm run dev:api
npm run ios:mobile
```

Then set API URL in mobile Settings:

```txt
http://localhost:3000/api
```

If simulator cannot reach API, use:

```txt
http://127.0.0.1:3000/api
```

## B. Physical iPhone Development Build

Prerequisites:

- Expo account.
- Apple Developer account for device builds if not using only simulator.
- Device on the same network as backend if using a local API.

Commands:

```bash
cd apps/mobile
npx expo install expo-dev-client
npm install -g eas-cli
# or use: npx eas-cli@latest

eas login
eas build:configure
eas device:create
eas build --platform ios --profile development
```

After the build finishes, open the EAS build install URL on the iPhone. Set API URL to LAN IP, not localhost:

```txt
http://<your-mac-lan-ip>:3000/api
```

## C. Internal Ad Hoc Distribution

The included `eas.json` has these profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

Build:

```bash
eas build --platform ios --profile preview
```

Share the EAS install URL with registered devices. For new iPhones, run:

```bash
eas device:create
eas build --platform ios --profile preview --refresh-ad-hoc-provisioning-profile
```

iOS ad hoc builds require registered device UDIDs and a rebuild or resigning when devices change.

## D. TestFlight Beta

Use production/App Store style build:

```bash
eas build --platform ios --profile production
```

Submit:

```bash
eas submit --platform ios
```

Then in App Store Connect:

1. Open the app.
2. Go to TestFlight.
3. Add test information.
4. Add internal testers or create an external tester group.
5. External testing requires beta app review for the first build in the group.
6. Testers install the Apple TestFlight app and open the invite link.

## E. App Store Later

Do not optimize for App Store v1. This is a private client; prefer a development build or TestFlight first.
