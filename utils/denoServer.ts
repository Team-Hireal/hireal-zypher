const PRODUCTION_LIKE_ENV =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL === "1" ||
  (typeof process.env.VERCEL_ENV !== "undefined" &&
    process.env.VERCEL_ENV !== "development");

function missingUrlError(): Error {
  return new Error(
    "DENO_SERVER_URL is required in production. Set it to your hosted Deno server's public URL " +
      "and redeploy. See https://vercel.com/docs/concepts/projects/environment-variables.",
  );
}

export function resolveDenoServerUrl(): string {
  const explicitUrl = process.env.DENO_SERVER_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  if (PRODUCTION_LIKE_ENV) {
    throw missingUrlError();
  }

  return "http://localhost:8000";
}

export function isProductionLikeEnvironment(): boolean {
  return PRODUCTION_LIKE_ENV;
}

