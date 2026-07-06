"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";

type CustomerAccountLayoutProps = {
    children: ReactNode;
};

const PUBLIC_CUSTOMER_AUTH_PATHS = [
    "/compte/login",
    "/compte/register",
] as const;

function isPublicCustomerAuthPath(pathname: string) {
    return PUBLIC_CUSTOMER_AUTH_PATHS.some((path) => pathname === path);
}

export default function CustomerAccountLayout({
    children,
}: CustomerAccountLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isLoading, isAuthenticated } = useCustomerAuth();

    const isPublicPath = isPublicCustomerAuthPath(pathname);

    useEffect(() => {
        if (isLoading || isPublicPath) {
            return;
        }

        if (!isAuthenticated) {
            router.replace("/compte/login");
        }
    }, [isLoading, isAuthenticated, isPublicPath, router]);

    if (isPublicPath) {
        return children;
    }

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-950">
                <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
                        Espace client
                    </p>

                    <h1 className="mt-3 text-2xl font-black">
                        Vérification de votre session...
                    </h1>
                </div>
            </main>
        );
    }

    if (!isAuthenticated) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-950">
                <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
                        Espace client
                    </p>

                    <h1 className="mt-3 text-2xl font-black">
                        Connexion requise
                    </h1>

                    <p className="mt-2 text-sm text-neutral-500">
                        Redirection vers la page de connexion...
                    </p>
                </div>
            </main>
        );
    }

    return children;
}
