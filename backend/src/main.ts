import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { AUTH_COOKIE_NAMES } from './auth/services/auth-cookie.service';

const UNSAFE_HTTP_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

function hasAuthCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return false;
  }

  const protectedCookieNames = Object.values(AUTH_COOKIE_NAMES);

  return protectedCookieNames.some((cookieName) =>
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

function getRequestOrigin(request: express.Request) {
  const origin = request.headers.origin;

  if (typeof origin === 'string' && origin.trim()) {
    return origin.trim().replace(/\/$/, '');
  }

  const referer = request.headers.referer;

  if (typeof referer === 'string' && referer.trim()) {
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function createCookieCsrfMiddleware(
  allowedOrigins: ReadonlySet<string>,
): express.RequestHandler {
  return (request, response, next) => {
    if (!isUnsafeMethod(request.method) || !hasAuthCookie(request.headers.cookie)) {
      next();
      return;
    }

    const requestOrigin = getRequestOrigin(request);

    if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
      response.status(403).json({
        message: 'Origine non autorisée.',
      });
      return;
    }

    if (request.headers['x-requested-with'] !== 'XMLHttpRequest') {
      response.status(403).json({
        message: 'Requête sécurisée invalide.',
      });
      return;
    }

    next();
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  const configService = app.get(ConfigService);
  const expressApp =
    app.getHttpAdapter().getInstance() as express.Application;

  const isProduction =
    configService.get<string>('NODE_ENV', 'development') === 'production';

  const allowedOrigins = new Set(
    configService.get<string[]>('FRONTEND_ORIGINS', []),
  );

  const trustProxyHops = configService.get<number>(
    'TRUST_PROXY_HOPS',
    isProduction ? 1 : 0,
  );

  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', trustProxyHops);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
      strictTransportSecurity: isProduction
        ? {
            maxAge: 31_536_000,
            includeSubDomains: true,
            preload: false,
          }
        : false,
    }),
  );

  app.use(
    express.json({
      limit: '1mb',
      strict: true,
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
      parameterLimit: 1_000,
    }),
  );

  app.enableCors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'Origin',
      'X-Requested-With',
    ],
    optionsSuccessStatus: 204,
    maxAge: 86_400,
  });

  app.use(createCookieCsrfMiddleware(allowedOrigins));

  const storageDriver = configService.get<'local' | 'azure'>(
    'STORAGE_DRIVER',
    'local',
  );

  if (storageDriver === 'local') {
    app.use(
      '/uploads',
      express.static(join(process.cwd(), 'uploads'), {
        dotfiles: 'deny',
        index: false,
        maxAge: isProduction ? '1d' : 0,
        setHeaders(response) {
          response.setHeader('X-Content-Type-Options', 'nosniff');
        },
      }),
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);

  await app.listen(port, '0.0.0.0');
}

void bootstrap().catch((error: unknown) => {
  console.error('Le backend Bigotti n’a pas pu démarrer.', error);
  process.exit(1);
});
