import type { ExpoConfig } from "expo/config";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.aiwardrobes.com";
const projectId = process.env.EXPO_PROJECT_ID || "42ed33ef-90a4-4f15-98ac-3061c76ea802";

const config: ExpoConfig = {
  name: process.env.APP_STORE_DISPLAY_NAME || "AI Wardrobe",
  slug: "ai-wardrobe",
  description: "A private AI wardrobe planner for clothing photos, outfit recommendations, closet insights, outfit diary, and try-on previews.",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "aiwardrobe",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#f7f1e8",
  },
  assetBundlePatterns: ["assets/*"],
  ios: {
    bundleIdentifier: process.env.IOS_BUNDLE_ID || "com.aiwardrobes.app",
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription: "AI Wardrobe uses your photo library so you can add clothing photos to your private wardrobe.",
      NSCameraUsageDescription: "AI Wardrobe uses the camera when you choose to capture clothing photos for your private wardrobe.",
    },
  },
  android: {
    package: process.env.ANDROID_PACKAGE_NAME || "com.aiwardrobes.app",
    permissions: [],
    blockedPermissions: ["android.permission.RECORD_AUDIO"],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#12221f",
    },
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission: "AI Wardrobe uses your selected photos to add clothing items to your wardrobe.",
        cameraPermission: "AI Wardrobe uses the camera when you choose to capture clothing photos.",
      },
    ],
  ],
  extra: {
    apiBaseUrl,
    eas: projectId ? { projectId } : undefined,
  },
};

export default config;
