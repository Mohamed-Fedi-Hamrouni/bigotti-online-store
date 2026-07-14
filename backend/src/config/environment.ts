type Environment = Record<string, unknown>;

const NODE_ENV_VALUES = new Set(["development", "test", "production"]);
const COOKIE_SAME_SITE_VALUES = new Set(["lax", "strict", "none"]);
const STORAGE_DRIVER_VALUES = new Set(["local", "azure"]);

const PLACEHOLDER_MARKERS = [
  "replace-with",
  "change-me",
  "your-",
  "xxxxxxxx",
  "example.com",
];

function readString(
  environment: Environment,
  key: string,
  options: {
    required?: boolean;
    defaultValue?: string;
  } = {},
) {
  const rawValue = environment[key];
  const normalizedValue =
    typeof rawValue === "string" ? rawValue.trim() : "";

  if (normalizedValue) {
    return normalizedValue;
  }

  if (options.defaultValue !== undefined) {
    return options.defaultValue;
  }

  if (options.required) {
    throw new Error(`Variable d’environnement obligatoire manquante : ${key}`);
  }

  return "";
}

function readInteger(
  environment: Environment,
  key: string,
  options: {
    defaultValue: number;
    minimum: number;
    maximum: number;
  },
) {
  const rawValue = readString(environment, key, {
    defaultValue: String(options.defaultValue),
  });

  const parsedValue = Number(rawValue);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < options.minimum ||
    parsedValue > options.maximum
  ) {
    throw new Error(
      `${key} doit être un entier compris entre ${options.minimum} et ${options.maximum}.`,
    );
  }

  return parsedValue;
}

function readBoolean(
  environment: Environment,
  key: string,
  defaultValue: boolean,
) {
  const rawValue = readString(environment, key, {
    defaultValue: String(defaultValue),
  }).toLowerCase();

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new Error(`${key} doit valoir "true" ou "false".`);
}

function containsPlaceholder(value: string) {
  const normalizedValue = value.toLowerCase();

  return PLACEHOLDER_MARKERS.some((marker) =>
    normalizedValue.includes(marker),
  );
}

function parseUrl(value: string, key: string) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${key} doit contenir une URL valide.`);
  }
}

function validateHttpUrl(
  value: string,
  key: string,
  options: {
    requireHttps: boolean;
    originOnly?: boolean;
  },
) {
  const parsedUrl = parseUrl(value, key);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`${key} doit utiliser le protocole HTTP ou HTTPS.`);
  }

  if (options.requireHttps && parsedUrl.protocol !== "https:") {
    throw new Error(`${key} doit utiliser HTTPS en production.`);
  }

  if (
    options.originOnly &&
    (parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash)
  ) {
    throw new Error(
      `${key} doit contenir uniquement une origine, sans chemin ni paramètres.`,
    );
  }

  return parsedUrl;
}

function parseFrontendOrigins(
  value: string,
  requireHttps: boolean,
): string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin, index) =>
      validateHttpUrl(origin, `FRONTEND_URL[${index}]`, {
        requireHttps,
        originOnly: true,
      }).origin,
    );

  const uniqueOrigins = [...new Set(origins)];

  if (uniqueOrigins.length === 0) {
    throw new Error(
      "FRONTEND_URL doit contenir au moins une origine frontend autorisée.",
    );
  }

  return uniqueOrigins;
}

function validateDatabaseUrl(value: string) {
  const parsedUrl = parseUrl(value, "DATABASE_URL");

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("DATABASE_URL doit utiliser PostgreSQL.");
  }

  return value;
}

function validateJwtSecret(value: string, isProduction: boolean) {
  const minimumLength = isProduction ? 64 : 16;

  if (value.length < minimumLength) {
    throw new Error(
      `JWT_SECRET doit contenir au moins ${minimumLength} caractères${
        isProduction ? " en production" : ""
      }.`,
    );
  }

  if (isProduction && containsPlaceholder(value)) {
    throw new Error("JWT_SECRET contient encore une valeur d’exemple.");
  }

  return value;
}

function validateGoogleClientId(value: string, isProduction: boolean) {
  if (!value) {
    if (isProduction) {
      throw new Error("GOOGLE_CLIENT_ID est obligatoire en production.");
    }

    return "";
  }

  if (
    containsPlaceholder(value) ||
    !value.endsWith(".apps.googleusercontent.com")
  ) {
    throw new Error("GOOGLE_CLIENT_ID n’est pas un Client ID Google valide.");
  }

  return value;
}

function validateMailFrom(value: string) {
  const plainEmailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
  const namedEmailPattern =
    /^[^<>]*<\s*[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+\s*>$/;

  if (!plainEmailPattern.test(value) && !namedEmailPattern.test(value)) {
    throw new Error(
      'MAIL_FROM doit être une adresse email ou respecter le format "Nom <email@domaine>".',
    );
  }

  return value;
}

function validateCookieDomain(value: string) {
  if (!value) {
    return "";
  }

  if (
    value.includes("://") ||
    value.includes("/") ||
    value.includes(":") ||
    !/^\.?(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(value)
  ) {
    throw new Error(
      "COOKIE_DOMAIN doit contenir uniquement un domaine DNS, sans protocole ni chemin.",
    );
  }

  return value.toLowerCase();
}


function validateAzureStorageAccountName(value: string) {
  if (!value) {
    return "";
  }

  if (!/^[a-z0-9]{3,24}$/.test(value)) {
    throw new Error(
      "AZURE_STORAGE_ACCOUNT_NAME doit contenir 3 à 24 lettres minuscules ou chiffres.",
    );
  }

  return value;
}

function validateAzureContainerName(value: string) {
  if (
    value.length < 3 ||
    value.length > 63 ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) ||
    value.includes("--")
  ) {
    throw new Error(
      "AZURE_STORAGE_CONTAINER_NAME doit respecter les règles de nommage Azure Blob.",
    );
  }

  return value;
}

export function validateEnvironment(
  environment: Environment,
): Environment {
  const nodeEnv = readString(environment, "NODE_ENV", {
    defaultValue: "development",
  }).toLowerCase();

  if (!NODE_ENV_VALUES.has(nodeEnv)) {
    throw new Error(
      'NODE_ENV doit valoir "development", "test" ou "production".',
    );
  }

  const isProduction = nodeEnv === "production";

  const storageDriver = readString(environment, "STORAGE_DRIVER", {
    defaultValue: isProduction ? "azure" : "local",
  }).toLowerCase();

  if (!STORAGE_DRIVER_VALUES.has(storageDriver)) {
    throw new Error('STORAGE_DRIVER doit valoir "local" ou "azure".');
  }

  if (isProduction && storageDriver !== "azure") {
    throw new Error(
      'STORAGE_DRIVER doit obligatoirement valoir "azure" en production.',
    );
  }

  const publicApiUrl = validateHttpUrl(
    readString(environment, "PUBLIC_API_URL", {
      defaultValue: "http://localhost:3000",
    }),
    "PUBLIC_API_URL",
    {
      requireHttps: isProduction,
      originOnly: false,
    },
  );

  const azureStorageConnectionString = readString(
    environment,
    "AZURE_STORAGE_CONNECTION_STRING",
  );

  if (isProduction && azureStorageConnectionString) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING ne doit pas être utilisée en production. Activez l’identité managée Azure.",
    );
  }

  const azureStorageAccountName = validateAzureStorageAccountName(
    readString(environment, "AZURE_STORAGE_ACCOUNT_NAME"),
  );

  const azureStorageContainerName = validateAzureContainerName(
    readString(environment, "AZURE_STORAGE_CONTAINER_NAME", {
      defaultValue: "media",
    }),
  );

  if (
    storageDriver === "azure" &&
    !azureStorageConnectionString &&
    !azureStorageAccountName
  ) {
    throw new Error(
      "Le stockage Azure exige AZURE_STORAGE_ACCOUNT_NAME ou une connexion Azurite en développement.",
    );
  }

  const azureStoragePublicBaseUrl = readString(
    environment,
    "AZURE_STORAGE_PUBLIC_BASE_URL",
  );

  if (azureStoragePublicBaseUrl) {
    validateHttpUrl(
      azureStoragePublicBaseUrl,
      "AZURE_STORAGE_PUBLIC_BASE_URL",
      {
        requireHttps: isProduction,
        originOnly: false,
      },
    );
  }

  const databaseUrl = validateDatabaseUrl(
    readString(environment, "DATABASE_URL", { required: true }),
  );

  const jwtSecret = validateJwtSecret(
    readString(environment, "JWT_SECRET", { required: true }),
    isProduction,
  );

  const frontendOrigins = parseFrontendOrigins(
    readString(environment, "FRONTEND_URL", { required: true }),
    isProduction,
  );

  const publicFrontendUrl = validateHttpUrl(
    readString(environment, "PUBLIC_FRONTEND_URL", { required: true }),
    "PUBLIC_FRONTEND_URL",
    {
      requireHttps: isProduction,
      originOnly: false,
    },
  );

  if (!frontendOrigins.includes(publicFrontendUrl.origin)) {
    throw new Error(
      "PUBLIC_FRONTEND_URL doit appartenir à la liste FRONTEND_URL.",
    );
  }

  const passwordResetDebug = readBoolean(
    environment,
    "PASSWORD_RESET_DEBUG",
    false,
  );

  if (isProduction && passwordResetDebug) {
    throw new Error(
      "PASSWORD_RESET_DEBUG doit obligatoirement être désactivé en production.",
    );
  }

  const resendApiKey = readString(environment, "RESEND_API_KEY");
  const mailFrom = readString(environment, "MAIL_FROM");
  const mailSupportEmail = readString(environment, "MAIL_SUPPORT_EMAIL");

  if (isProduction) {
    if (
      !resendApiKey ||
      !resendApiKey.startsWith("re_") ||
      containsPlaceholder(resendApiKey)
    ) {
      throw new Error(
        "RESEND_API_KEY doit contenir une clé Resend réelle en production.",
      );
    }

    if (!mailFrom || containsPlaceholder(mailFrom)) {
      throw new Error("MAIL_FROM doit être configuré en production.");
    }

    validateMailFrom(mailFrom);

    if (!mailSupportEmail || containsPlaceholder(mailSupportEmail)) {
      throw new Error(
        "MAIL_SUPPORT_EMAIL doit être configuré en production.",
      );
    }

    validateMailFrom(mailSupportEmail);
  } else {
    if (mailFrom) {
      validateMailFrom(mailFrom);
    }

    if (mailSupportEmail) {
      validateMailFrom(mailSupportEmail);
    }
  }

  const cookieSameSite = readString(environment, "COOKIE_SAME_SITE", {
    defaultValue: isProduction ? "none" : "lax",
  }).toLowerCase();

  if (!COOKIE_SAME_SITE_VALUES.has(cookieSameSite)) {
    throw new Error(
      'COOKIE_SAME_SITE doit valoir "lax", "strict" ou "none".',
    );
  }

  if (!isProduction && cookieSameSite === "none") {
    throw new Error(
      'COOKIE_SAME_SITE="none" exige HTTPS et ne doit pas être utilisé avec le serveur HTTP local.',
    );
  }

  const cookieDomain = validateCookieDomain(
    readString(environment, "COOKIE_DOMAIN"),
  );

  return {
    ...environment,
    NODE_ENV: nodeEnv,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    PORT: readInteger(environment, "PORT", {
      defaultValue: 3000,
      minimum: 1,
      maximum: 65535,
    }),
    TRUST_PROXY_HOPS: readInteger(environment, "TRUST_PROXY_HOPS", {
      defaultValue: isProduction ? 1 : 0,
      minimum: 0,
      maximum: 10,
    }),
    FRONTEND_URL: frontendOrigins.join(","),
    FRONTEND_ORIGINS: frontendOrigins,
    PUBLIC_FRONTEND_URL: publicFrontendUrl.toString().replace(/\/$/, ""),
    PUBLIC_API_URL: publicApiUrl.toString().replace(/\/$/, ""),
    STORAGE_DRIVER: storageDriver,
    AZURE_STORAGE_CONNECTION_STRING: azureStorageConnectionString,
    AZURE_STORAGE_ACCOUNT_NAME: azureStorageAccountName,
    AZURE_STORAGE_CONTAINER_NAME: azureStorageContainerName,
    AZURE_STORAGE_PUBLIC_BASE_URL: azureStoragePublicBaseUrl.replace(
      /\/$/,
      "",
    ),
    AZURE_STORAGE_AUTO_CREATE_CONTAINER: readBoolean(
      environment,
      "AZURE_STORAGE_AUTO_CREATE_CONTAINER",
      !isProduction,
    ),
    AZURE_STORAGE_CONTAINER_PUBLIC: readBoolean(
      environment,
      "AZURE_STORAGE_CONTAINER_PUBLIC",
      !isProduction,
    ),
    APP_NAME: readString(environment, "APP_NAME", {
      defaultValue: "Bigotti Collection",
    }),
    RESEND_API_KEY: resendApiKey,
    MAIL_FROM: mailFrom,
    MAIL_SUPPORT_EMAIL: mailSupportEmail,
    PASSWORD_RESET_DEBUG: passwordResetDebug,
    GOOGLE_CLIENT_ID: validateGoogleClientId(
      readString(environment, "GOOGLE_CLIENT_ID"),
      isProduction,
    ),
    COOKIE_DOMAIN: cookieDomain,
    COOKIE_SAME_SITE: cookieSameSite,
    GLOBAL_RATE_LIMIT_TTL_MS: readInteger(
      environment,
      "GLOBAL_RATE_LIMIT_TTL_MS",
      {
        defaultValue: 60_000,
        minimum: 1_000,
        maximum: 3_600_000,
      },
    ),
    GLOBAL_RATE_LIMIT_MAX: readInteger(
      environment,
      "GLOBAL_RATE_LIMIT_MAX",
      {
        defaultValue: 120,
        minimum: 10,
        maximum: 10_000,
      },
    ),
  };
}
