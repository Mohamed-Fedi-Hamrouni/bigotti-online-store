import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type LoginAttemptScope = 'admin' | 'customer';

type LoginAttemptRecord = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, LoginAttemptRecord>();

  assertCanAttempt(scope: LoginAttemptScope, identifier: string, ip: string) {
    const key = this.buildKey(scope, identifier, ip);
    const record = this.attempts.get(key);

    if (!record) {
      return;
    }

    const now = Date.now();

    if (record.blockedUntil && record.blockedUntil > now) {
      const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);

      throw new HttpException(
        `Trop de tentatives de connexion. Veuillez réessayer dans ${remainingMinutes} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (record.firstAttemptAt + WINDOW_MS < now) {
      this.attempts.delete(key);
    }
  }

  recordFailure(scope: LoginAttemptScope, identifier: string, ip: string) {
    const key = this.buildKey(scope, identifier, ip);
    const now = Date.now();

    const existingRecord = this.attempts.get(key);

    if (!existingRecord || existingRecord.firstAttemptAt + WINDOW_MS < now) {
      this.attempts.set(key, {
        count: 1,
        firstAttemptAt: now,
        blockedUntil: null,
      });

      return;
    }

    const nextCount = existingRecord.count + 1;

    this.attempts.set(key, {
      count: nextCount,
      firstAttemptAt: existingRecord.firstAttemptAt,
      blockedUntil: nextCount >= MAX_ATTEMPTS ? now + BLOCK_MS : null,
    });
  }

  reset(scope: LoginAttemptScope, identifier: string, ip: string) {
    const key = this.buildKey(scope, identifier, ip);

    this.attempts.delete(key);
  }

  private buildKey(scope: LoginAttemptScope, identifier: string, ip: string) {
    return [
      scope,
      identifier.trim().toLowerCase(),
      ip.trim().toLowerCase() || 'unknown',
    ].join(':');
  }
}
