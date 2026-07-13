import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Keep the route context explicit. The workspace is installed in a hoisted
// monorepo, so relying on expo-router/entry to infer the app root can resolve
// the wrong directory in development and leave the route tree empty.
export function App() {
  const context = require.context('./app');
  return <ExpoRoot context={context} />;
}

registerRootComponent(App);
