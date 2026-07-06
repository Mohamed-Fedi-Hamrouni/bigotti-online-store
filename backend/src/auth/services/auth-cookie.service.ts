import { Injectable } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';

const ADMIN_COOKIE_NAME = 'bigotti_admin_access_token';
const CUSTOMER_COOKIE_NAME = 'bigotti_customer_access_token';

const ADMIN_ACCESS_TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;
const CUSTOMER_ACCESS_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthCookieService {
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  setAdminAccessToken(response: Response, accessToken: string) {
    response.cookie(
      ADMIN_COOKIE_NAME,
      accessToken,
      this.buildCookieOptions(ADMIN_ACCESS_TOKEN_MAX_AGE),
    );
  }

  clearAdminAccessToken(response: Response) {
    response.clearCookie(ADMIN_COOKIE_NAME, this.buildClearCookieOptions());
  }

  setCustomerAccessToken(response: Response, accessToken: string) {
    response.cookie(
      CUSTOMER_COOKIE_NAME,
      accessToken,
      this.buildCookieOptions(CUSTOMER_ACCESS_TOKEN_MAX_AGE),
    );
  }

  clearCustomerAccessToken(response: Response) {
    response.clearCookie(CUSTOMER_COOKIE_NAME, this.buildClearCookieOptions());
  }

  private buildCookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
      maxAge,
      path: '/',
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    };
  }

  private buildClearCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
      path: '/',
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    };
  }
}

export const AUTH_COOKIE_NAMES = {
  admin: ADMIN_COOKIE_NAME,
  customer: CUSTOMER_COOKIE_NAME,
} as const;
