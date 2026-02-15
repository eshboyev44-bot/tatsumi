"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("PWA: Service worker disabled in development mode");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      console.warn("PWA: Service workers are not supported");
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("PWA: Service worker registered successfully");

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New service worker available
              console.log("PWA: New version available");

              // Optionally show update notification
              if (
                confirm(
                  "Yangi versiya mavjud. Yangilash uchun sahifani qayta yuklaysizmi?"
                )
              ) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            }
          });
        });

        // Handle controller change (new service worker activated)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("PWA: Service worker updated");
        });

        // Check for updates periodically (every hour)
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      } catch (error) {
        console.error("PWA: Service worker ro'yxatdan o'tmadi:", error);
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}

