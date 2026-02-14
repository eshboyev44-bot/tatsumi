import { useCallback, useMemo, useState } from "react";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

type NotifyOptions = {
  body?: string;
  tag?: string;
};

function resolvePermission(): BrowserNotificationPermission {
  if (typeof window === "undefined") {
    return "default";
  }

  if (!("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.permission;
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<BrowserNotificationPermission>(
    resolvePermission
  );

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined") {
      return "unsupported" as const;
    }

    if (!("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported" as const;
    }

    if (window.Notification.permission === "granted") {
      setPermission("granted");
      return "granted" as const;
    }

    const nextPermission = await window.Notification.requestPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  const notify = useCallback((title: string, options?: NotifyOptions) => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("Notification" in window)) {
      return;
    }

    if (window.Notification.permission !== "granted") {
      return;
    }

    const notification = new window.Notification(title, {
      body: options?.body,
      tag: options?.tag,
      icon: "/favicon.ico",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, []);

  return useMemo(
    () => ({
      notify,
      permission,
      requestPermission,
      supported: permission !== "unsupported",
    }),
    [notify, permission, requestPermission]
  );
}
