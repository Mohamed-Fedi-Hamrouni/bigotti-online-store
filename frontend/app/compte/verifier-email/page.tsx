"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { verifyCustomerEmail } from "@/lib/api";

type VerificationState = "loading" | "success" | "error";

export default function VerifyCustomerEmailPage() {
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("Vérification en cours…");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      const timeout = window.setTimeout(() => {
        setState("error");
        setMessage("Ce lien de vérification est incomplet ou invalide.");
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    verifyCustomerEmail(token)
      .then((response) => {
        setState("success");
        setMessage(response.message);
      })
      .catch((error) => {
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Ce lien est expiré, invalide ou déjà utilisé.",
        );
      });
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <PublicHeader />
      <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-6 py-12">
        <div className="w-full rounded-[2rem] bg-white p-10 text-center shadow-sm">
          <h1 className="text-4xl font-black">
            {state === "loading"
              ? "Vérification"
              : state === "success"
                ? "Email vérifié"
                : "Lien non valide"}
          </h1>
          <p className="mt-5 leading-7 text-neutral-600">{message}</p>
          {state === "success" && (
            <Link
              href="/compte/login"
              className="mt-7 inline-block rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
            >
              Se connecter
            </Link>
          )}
          {state === "error" && (
            <Link
              href="/compte/login"
              className="mt-7 inline-block font-bold underline"
            >
              Retour à la connexion
            </Link>
          )}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
