import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import basicAuth from 'express-basic-auth';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from '@/app.module';
import { swaggerConfig } from '@/config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const port = config.get<number>('PORT', 3000);

  // ── Request ID (must run before everything else) ──────────────────────
  // Reuse an inbound `x-request-id` if present, otherwise mint one.
  // Exposed on `req.requestId` (read by the logger / exception filter) and
  // echoed back on the response so clients can correlate.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    req['requestId'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  // ── Security headers ─────────────────────────────────────────────────
  // app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────────────────
  // Dev: allow the Vite dev server. Prod: read a comma-separated allowlist
  // from CORS_ORIGINS. `credentials: true` so the HTTP-only JWT cookie is
  // sent on cross-origin requests.
  const corsOrigins = isProduction
    ? (config.get<string>('CORS_ORIGINS') ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : ['http://localhost:5173'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // ── Global validation ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── URI versioning (e.g. /v1/...) ────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });

  // NOTE: the global HttpExceptionFilter is registered via APP_FILTER in
  // AppModule (so it can inject LoggerService) — do NOT register it here.

  // ── Swagger (non-production only) ────────────────────────────────────
  const enableSwagger = !isProduction;
  if (enableSwagger) {
    // Basic-auth lives inside this block: it must never run in production,
    // and must not read swagger credentials when the docs are disabled.
    const swaggerUser = config.getOrThrow<string>('SWAGGER_USER');
    const swaggerPass = config.getOrThrow<string>('SWAGGER_PASS');

    app.use(
      ['/docs', '/docs-json'],
      basicAuth({
        challenge: true,
        users: { [swaggerUser]: swaggerPass },
      }),
    );

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
    });
  }

  await app.listen(port);
}

void bootstrap();
