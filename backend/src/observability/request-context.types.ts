import type { Request } from 'express';

export type ObservablePrincipal = {
  sub?: unknown;
  id?: unknown;
  role?: unknown;
};

export type RequestContext = Request & {
  requestId: string;
  requestStartedAt?: bigint;
  user?: ObservablePrincipal;
  customer?: ObservablePrincipal;
};

export function getSafePrincipal(request: RequestContext): {
  userId?: string;
  role?: string;
} {
  const principal = request.user ?? request.customer;
  const rawUserId = principal?.sub ?? principal?.id;
  const userId =
    typeof rawUserId === 'string' && rawUserId ? rawUserId : undefined;
  const role =
    typeof principal?.role === 'string' && principal.role
      ? principal.role
      : principal === request.customer && userId
        ? 'CUSTOMER'
        : undefined;

  return { userId, role };
}

export function getRequestPath(request: Request): string {
  const rawUrl = request.originalUrl || request.url || '/';

  try {
    return new URL(rawUrl, 'http://localhost').pathname;
  } catch {
    return '/';
  }
}

export function getDurationMs(startedAt?: bigint): number | undefined {
  if (startedAt === undefined) {
    return undefined;
  }

  const duration = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
  return Number.isFinite(duration) ? Math.max(0, Math.trunc(duration)) : 0;
}
