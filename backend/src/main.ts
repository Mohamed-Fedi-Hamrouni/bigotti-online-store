import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

const AUTH_COOKIE_NAMES = [
  'bigotti_admin_access_token',
  'bigotti_customer_access_token',
] as const;

const UNSAFE_HTTP_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

function getAllowedOrigins() {
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    return defaultOrigins;
  }

  return frontendUrl
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function hasAuthCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return false;
  }

  return AUTH_COOKIE_NAMES.some((cookieName) =>
    cookieHeader
      .split(';')
      .some((cookie) => cookie.trim().startsWith(`${cookieName}=`)),
  );
}

function isUnsafeMethod(method: string) {
  return UNSAFE_HTTP_METHODS.includes(
    method.toUpperCase() as (typeof UNSAFE_HTTP_METHODS)[number],
  );
}

function createCookieCsrfMiddleware(allowedOrigins: string[]) {
  return (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    if (!isUnsafeMethod(request.method)) {
      next();
      return;
    }

    if (!hasAuthCookie(request.headers.cookie)) {
      next();
      return;
    }

    const origin = request.headers.origin;

    if (origin && !allowedOrigins.includes(origin)) {
      response.status(403).json({
        message: 'Origine non autorisée.',
      });
      return;
    }

    const requestedWith = request.headers['x-requested-with'];

    if (requestedWith !== 'XMLHttpRequest') {
      response.status(403).json({
        message: 'Requête sécurisée invalide.',
      });
      return;
    }

    next();
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();
  const allowedOrigins = getAllowedOrigins();

  expressApp.set('trust proxy', 1);

  app.enableCors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.use(createCookieCsrfMiddleware(allowedOrigins));
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port);
}

bootstrap();
