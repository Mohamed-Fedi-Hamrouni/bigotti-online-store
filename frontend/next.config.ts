import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

function getOrigin(value: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL doit contenir une URL valide.");
  }
}

function isLocalOrigin(origin: string) {
  if (!origin) {
    return false;
  }

  const hostname = new URL(origin).hostname;

  return hostname === "localhost" || hostname === "127.0.0.1";
}

const apiOrigin = getOrigin(apiUrl);
const isProductionBuild = process.env.NODE_ENV === "production";
const isDeployedProduction =
  isProductionBuild && Boolean(apiOrigin) && !isLocalOrigin(apiOrigin);

if (isProductionBuild && !apiOrigin) {
  throw new Error(
    "NEXT_PUBLIC_API_URL doit être configurée avant le build frontend.",
  );
}

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

if (
  isProductionBuild &&
  (!googleClientId ||
    googleClientId.includes("xxxxxxxx") ||
    googleClientId.includes("your-google-client-id") ||
    !googleClientId.endsWith(".apps.googleusercontent.com"))
) {
  throw new Error(
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID doit contenir un Client ID Google réel avant le build.",
  );
}

function buildContentSecurityPolicy() {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client",
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    `connect-src 'self' ${apiOrigin} https://accounts.google.com/gsi/`,
    "frame-src 'self' https://accounts.google.com/gsi/",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (isDeployedProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
];

if (isDeployedProduction) {
  securityHeaders.push(
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(),
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    },
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
