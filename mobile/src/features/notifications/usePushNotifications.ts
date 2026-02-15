import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type PushNotificationPayload = {
  conversationId?: string;
};

type PermissionResult = {
  status?: string;
  ios?: {
    allowsSound?: boolean;
  };
};

type ExpoPushTokenResult = {
  data?: string;
};

type NotificationResponseLike = {
  notification?: {
    request?: {
      content?: {
        title?: string;
        data?: unknown;
      };
    };
  };
};

type NotificationsModule = {
  AndroidImportance?: {
    MAX: number;
  };
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }) => void;
  setNotificationChannelAsync: (
    channelId: string,
    channel: {
      name: string;
      importance: number;
      sound?: "default";
      enableVibrate?: boolean;
      vibrationPattern?: number[];
    }
  ) => Promise<void>;
  getPermissionsAsync: () => Promise<PermissionResult>;
  requestPermissionsAsync: (options?: {
    ios?: {
      allowAlert?: boolean;
      allowBadge?: boolean;
      allowSound?: boolean;
    };
  }) => Promise<PermissionResult>;
  getExpoPushTokenAsync: (options: {
    projectId: string;
  }) => Promise<ExpoPushTokenResult>;
  addNotificationReceivedListener: (listener: () => void) => {
    remove: () => void;
  };
  addNotificationResponseReceivedListener: (
    listener: (response: NotificationResponseLike) => void
  ) => {
    remove: () => void;
  };
};

let cachedNotificationsModule: NotificationsModule | null | undefined;
let isNotificationHandlerConfigured = false;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function loadNotificationsModule() {
  if (cachedNotificationsModule !== undefined) {
    return cachedNotificationsModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedNotificationsModule = require("expo-notifications") as NotificationsModule;
  } catch {
    cachedNotificationsModule = null;
  }

  return cachedNotificationsModule;
}

function resolveExpoProjectId() {
  const fromEnv = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID?.trim();
  if (fromEnv) {
    if (!UUID_REGEX.test(fromEnv)) {
      console.warn(
        "EXPO_PUBLIC_EXPO_PROJECT_ID noto'g'ri. U UUID bo'lishi kerak (masalan: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)."
      );
      return null;
    }
    return fromEnv;
  }

  return null;
}

export function usePushNotifications(session: Session | null) {
  const currentTokenRef = useRef<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = session?.user.id ?? null;
    if (!currentUserId) {
      return;
    }

    const notifications = loadNotificationsModule();
    if (!notifications) {
      console.warn(
        "expo-notifications topilmadi. `cd mobile && npm install expo-notifications` ni ishga tushiring."
      );
      return;
    }

    if (!isNotificationHandlerConfigured) {
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      isNotificationHandlerConfigured = true;
    }

    let isDisposed = false;

    const registerPushToken = async () => {
      const projectId = resolveExpoProjectId();
      if (!projectId) {
        console.warn(
          "Expo projectId topilmadi. EXPO_PUBLIC_EXPO_PROJECT_ID ni mobile/.env ga qo'shing."
        );
        return;
      }

      if (Platform.OS === "android") {
        await notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: notifications.AndroidImportance?.MAX ?? 5,
          sound: "default",
          enableVibrate: true,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const existingPermission = await notifications.getPermissionsAsync();
      let permissionStatus = existingPermission.status;
      let allowsSound = existingPermission.ios?.allowsSound ?? true;

      if (permissionStatus !== "granted" || !allowsSound) {
        const requestedPermission = await notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        permissionStatus = requestedPermission.status;
        allowsSound = requestedPermission.ios?.allowsSound ?? true;
      }

      if (permissionStatus !== "granted" || !allowsSound) {
        console.warn("Push notification ruxsati berilmadi.");
        return;
      }

      let tokenData: ExpoPushTokenResult;
      try {
        tokenData = await notifications.getExpoPushTokenAsync({ projectId });
      } catch (error) {
        console.warn(
          "Expo push tokenni olishda xatolik. Real qurilma va to'g'ri projectId tekshiring.",
          error
        );
        return;
      }

      const expoPushToken = tokenData.data?.trim();
      if (!expoPushToken || isDisposed) {
        return;
      }

      currentTokenRef.current = expoPushToken;

      const { error } = await supabase.rpc("upsert_push_token", {
        p_expo_push_token: expoPushToken,
        p_platform: Platform.OS,
      });

      if (error) {
        console.error("upsert_push_token failed:", error.message);
        return;
      }

      console.log("push token registered:", {
        platform: Platform.OS,
        tokenPreview: expoPushToken.slice(0, 22),
      });
    };

    const receivedSubscription = notifications.addNotificationReceivedListener(() => {
      // App foreground holatida kelgan notification avtomatik ko'rsatiladi.
    });

    const responseSubscription = notifications.addNotificationResponseReceivedListener(
      (response: NotificationResponseLike) => {
        const data = response.notification?.request?.content?.data as
          | PushNotificationPayload
          | undefined;
        const conversationId =
          typeof data?.conversationId === "string"
            ? data.conversationId
            : null;

        if (!conversationId) {
          return;
        }

        const title = response.notification?.request?.content?.title || "Suhbat";
        router.push({
          pathname: "/chat/[conversationId]",
          params: {
            conversationId,
            title,
          },
        });
      }
    );

    void registerPushToken();

    return () => {
      isDisposed = true;
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [session?.user.id]);

  useEffect(() => {
    const nextUserId = session?.user.id ?? null;
    const previousUserId = previousUserIdRef.current;

    if (previousUserId && !nextUserId && currentTokenRef.current) {
      void supabase.rpc("remove_push_token", {
        p_expo_push_token: currentTokenRef.current,
      });
    }

    previousUserIdRef.current = nextUserId;
  }, [session?.user.id]);
}
