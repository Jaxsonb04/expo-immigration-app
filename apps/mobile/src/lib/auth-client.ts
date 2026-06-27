import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://api-production-0041.up.railway.app";

export const authClient = createAuthClient({
  baseURL: `${API_BASE_URL}/api/auth`,
  plugins: [
    expoClient({
      scheme: "heroui-native-app",
      storage: {
        getItem: (key) => SecureStore.getItem(key),
        setItem: (key, value) => SecureStore.setItem(key, value),
      },
      storagePrefix: "immigration-auth",
    }),
  ],
});
