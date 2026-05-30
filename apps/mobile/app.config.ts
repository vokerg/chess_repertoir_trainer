export default {
  expo: {
    name: 'Chess Trainer',
    slug: 'chess-repertoire-trainer-mobile',
    scheme: 'chessreptrainer',
    version: '0.1.0',
    orientation: 'portrait',
    platforms: ['ios'],
    ios: {
      bundleIdentifier: 'com.vokerg.chessrepertoiretrainer',
      supportsTablet: true,
    },
    extra: {
      defaultApiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://YOUR_RENDER_API_HOST/api',
    },
    plugins: ['expo-router'],
  },
};
