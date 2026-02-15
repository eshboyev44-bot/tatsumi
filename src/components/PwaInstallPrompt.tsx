"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowPrompt(true);
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setShowPrompt(false);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Remember dismissal for 7 days
        localStorage.setItem(
            "pwa-install-dismissed",
            (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
        );
    };

    useEffect(() => {
        const dismissed = localStorage.getItem("pwa-install-dismissed");
        if (dismissed && parseInt(dismissed) > Date.now()) {
            setShowPrompt(false);
        }
    }, []);

    if (!showPrompt || !deferredPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
            <div className="bg-gradient-to-br from-[#0f2a4a] to-[#061226] border border-[#6cc2ff]/20 rounded-2xl shadow-2xl p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#6cc2ff] to-[#4a9fd8] rounded-xl flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-[#070d17]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[#dff2ff] font-semibold text-sm mb-1">
                            Ilovani o&apos;rnating
                        </h3>
                        <p className="text-[#a8c5e0] text-xs leading-relaxed">
                            Tatsumi&apos;ni qurilmangizga o&apos;rnating va tezroq kirish
                            imkoniyatiga ega bo&apos;ling.
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-[#6b8aa3] hover:text-[#a8c5e0] transition-colors"
                        aria-label="Yopish"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>
                <div className="mt-4 flex gap-2">
                    <button
                        onClick={handleInstall}
                        className="flex-1 bg-gradient-to-r from-[#6cc2ff] to-[#4a9fd8] text-[#070d17] font-semibold text-sm py-2.5 px-4 rounded-lg hover:shadow-lg hover:shadow-[#6cc2ff]/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        O&apos;rnatish
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-4 py-2.5 text-[#a8c5e0] text-sm font-medium hover:text-[#dff2ff] transition-colors"
                    >
                        Keyinroq
                    </button>
                </div>
            </div>
        </div>
    );
}
