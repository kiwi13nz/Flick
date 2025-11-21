export default {
  expo: {
    name: "Flick",
    slug: "flick-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "flick",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.flick.app"
    },
    android: {
      package: "com.flick.app",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#FF6B35"
      }
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-camera",
      "expo-web-browser"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  }
};