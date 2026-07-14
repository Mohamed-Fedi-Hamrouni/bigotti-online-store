import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

const ADMIN_ACCESS_COOKIE_NAME = 'bigotti_admin_access_token';
const ADMIN_REFRESH_COOKIE_NAME = 'bigotti_admin_refresh_token';
const CUSTOMER_ACCESS_COOKIE_NAME = 'bigotti_customer_access_token';
const CUSTOMER_REFRESH_COOKIE_NAME = 'bigotti_customer_refresh_token';

const ADMIN_ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const ADMIN_REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const CUSTOMER_ACCESS_TOKEN_MAX_AGE = 30 * 60 * 1000;
const CUSTOMER_REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const ADMIN_REFRESH_COOKIE_PATH = '/auth';
const CUSTOMER_REFRESH_COOKIE_PATH = '/customer-auth';

type CookieSameSite = 'lax' | 'strict' | 'none';

export type CookieRequestLike = {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class AuthCookieService {
  private readonly isProduction: boolean;
  private readonly cookieDomain: string | undefined;
  private readonly sameSite: CookieSameSite;

  constructor(private readonly configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV', 'development') ===
      'production';

    this.cookieDomain =
      this.configService.get<string>('COOKIE_DOMAIN')?.trim() || undefined;

    this.sameSite = this.configService.get<CookieSameSite>(
      'COOKIE_SAME_SITE',
      this.isProduction ? 'none' : 'lax',
    );
  }

  setAdminAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie(
      ADMIN_ACCESS_COOKIE_NAME,
      accessToken,
      this.buildCookieOptions(ADMIN_ACCESS_TOKEN_MAX_AGE, '/'),
    );

    response.cookie(
      ADMIN_REFRESH_COOKIE_NAME,
      refreshToken,
      this.buildCookieOptions(
        ADMIN_REFRESH_TOKEN_MAX_AGE,
        ADMIN_REFRESH_COOKIE_PATH,
      ),
    );
  }

  clearAdminAuthCookies(response: Response) {
    response.clearCookie(
      ADMIN_ACCESS_COOKIE_NAME,
      this.buildClearCookieOptions('/'),
    );

    response.clearCookie(
      ADMIN_REFRESH_COOKIE_NAME,
      this.buildClearCookieOptions(ADMIN_REFRESH_COOKIE_PATH),
    );
  }

  setCustomerAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie(
      CUSTOMER_ACCESS_COOKIE_NAME,
      accessToken,
      this.buildCookieOptions(CUSTOMER_ACCESS_TOKEN_MAX_AGE, '/'),
    );

    response.cookie(
      CUSTOMER_REFRESH_COOKIE_NAME,
      refreshToken,
      this.buildCookieOptions(
        CUSTOMER_REFRESH_TOKEN_MAX_AGE,
        CUSTOMER_REFRESH_COOKIE_PATH,
      ),
    );
  }

  clearCustomerAuthCookies(response: Response) {
    response.clearCookie(
      CUSTOMER_ACCESS_COOKIE_NAME,
      this.buildClearCookieOptions('/'),
    );

    response.clearCookie(
      CUSTOMER_REFRESH_COOKIE_NAME,
      this.buildClearCookieOptions(CUSTOMER_REFRESH_COOKIE_PATH),
    );
  }

  getAdminAccessToken(request: CookieRequestLike) {
    return this.getCookieValue(request, ADMIN_ACCESS_COOKIE_NAME);
  }

  getAdminRefreshToken(request: CookieRequestLike) {
    return this.getCookieValue(request, ADMIN_REFRESH_COOKIE_NAME);
  }

  getCustomerAccessToken(request: CookieRequestLike) {
    return this.getCookieValue(request, CUSTOMER_ACCESS_COOKIE_NAME);
  }

  getCustomerRefreshToken(request: CookieRequestLike) {
    return this.getCookieValue(request, CUSTOMER_REFRESH_COOKIE_NAME);
  }

  setAdminAccessToken(response: Response, accessToken: string) {
    response.cookie(
      ADMIN_ACCESS_COOKIE_NAME,
      accessToken,
      this.buildCookieOptions(ADMIN_ACCESS_TOKEN_MAX_AGE, '/'),
    );
  }

  clearAdminAccessToken(response: Response) {
    this.clearAdminAuthCookies(response);
  }

  setCustomerAccessToken(response: Response, accessToken: string) {
    response.cookie(
      CUSTOMER_ACCESS_COOKIE_NAME,
      accessToken,
      this.buildCookieOptions(CUSTOMER_ACCESS_TOKEN_MAX_AGE, '/'),
    );
  }

  clearCustomerAccessToken(response: Response) {
    this.clearCustomerAuthCookies(response);
  }

  private getCookieValue(request: CookieRequestLike, cookieName: string) {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader || Array.isArray(cookieHeader)) {
      return undefined;
    }

    for (const cookie of cookieHeader.split(';')) {
      const [rawName, ...rawValueParts] = cookie.trim().split('=');

      if (rawName === cookieName) {
        return decodeURIComponent(rawValueParts.join('='));
      }
    }

    return undefined;
  }

  private buildCookieOptions(
    maxAge: number,
    path: string,
  ): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.sameSite,
      maxAge,
      path,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    };
  }

  private buildClearCookieOptions(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.sameSite,
      path,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    };
  }
}

export const AUTH_COOKIE_NAMES = {
  admin: ADMIN_ACCESS_COOKIE_NAME,
  adminRefresh: ADMIN_REFRESH_COOKIE_NAME,
  customer: CUSTOMER_ACCESS_COOKIE_NAME,
  customerRefresh: CUSTOMER_REFRESH_COOKIE_NAME,
} as const;
