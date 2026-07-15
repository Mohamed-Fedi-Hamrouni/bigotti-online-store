"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleButtonText = "signin_with" | "signup_with" | "continue_with";

type GoogleIdentityButtonProps = {
  onCredential: (credential: string) => void | Promise<void>;
  text?: GoogleButtonText;
  disabled?: boolean;
};

type GoogleAccountsId = {
  initialize: (configuration: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: "popup";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      shape: "pill";
      text: GoogleButtonText;
      logo_alignment: "left";
      locale: "fr";
      width?: number;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

function renderGoogleButton(
  container: HTMLDivElement,
  callbackRef: { current: GoogleIdentityButtonProps["onCredential"] },
  text: GoogleButtonText,
) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const googleId = window.google?.accounts.id;

  if (!clientId || !googleId) {
    return false;
  }

  googleId.initialize({
    client_id: clientId,
    ux_mode: "popup",
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: (response) => {
      if (response.credential) {
        void callbackRef.current(response.credential);
      }
    },
  });

  container.replaceChildren();

  googleId.renderButton(container, {
    type: "standard",
    theme: "outline",
    size: "large",
    shape: "pill",
    text,
    logo_alignment: "left",
    locale: "fr",
    width: Math.max(240, Math.min(container.clientWidth || 360, 400)),
  });

  return true;
}

export function GoogleIdentityButton({
  onCredential,
  text = "continue_with",
  disabled = false,
}: GoogleIdentityButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const container = containerRef.current;

    if (!scriptReady || !container) {
      return;
    }

    const rendered = renderGoogleButton(container, callbackRef, text);

    if (!rendered) {
      setScriptError(true);
    }
  }, [scriptReady, text]);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
        onError={() => setScriptError(true)}
      />

      <div
        className={disabled ? "pointer-events-none opacity-60" : ""}
        aria-busy={!scriptReady || disabled}
      >
        <div ref={containerRef} className="min-h-11 w-full" />

        {!clientId && (
          <p className="mt-2 text-sm font-semibold text-red-700">
            La connexion Google n’est pas configurée.
          </p>
        )}

        {clientId && scriptError && (
          <p className="mt-2 text-sm font-semibold text-red-700">
            Le bouton Google n’a pas pu être chargé.
          </p>
        )}

        {clientId && !scriptReady && !scriptError && (
          <p className="text-center text-sm text-neutral-500">
            Chargement de Google…
          </p>
        )}
      </div>
    </>
  );
}
