import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * Wraps @nestjs/config with Joi schema validation that runs on boot.
 * The app refuses to start if any required environment variable is
 * missing or malformed.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),

        // Infrastructure connections — required everywhere.
        // DATABASE_URL: Joi.string().required(),
        // REDIS_URL: Joi.string().required(),

        // Auth signing key — must be long enough to be safe.
        JWT_SECRET: Joi.string().min(32).required(),

        // Comma-separated list of allowed CORS origins (production).
        CORS_ORIGINS: Joi.string().optional(),

        // Swagger basic-auth credentials — required only in development,
        // where the docs are served; optional otherwise.
        SWAGGER_USER: Joi.string().when('NODE_ENV', {
          is: 'development',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        SWAGGER_PASS: Joi.string().when('NODE_ENV', {
          is: 'development',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),

        // Shared events infrastructure (transactional outbox dispatcher).
        EVENTS_POLL_INTERVAL_MS: Joi.number().default(1000),
        EVENTS_BATCH_SIZE: Joi.number().default(20),
        EVENTS_MAX_ATTEMPTS: Joi.number().default(5),
        EVENTS_DISPATCHER_ENABLED: Joi.boolean().default(true),

        // Notification context — SMTP (Gmail in development; see .env.example).
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().default(465),
        SMTP_SECURE: Joi.boolean().default(true),
        SMTP_USER: Joi.string().required(),
        SMTP_PASSWORD: Joi.string().required(),
        MAIL_FROM_NAME: Joi.string().default('Vitale'),
        MAIL_FROM_ADDRESS: Joi.string().required(),
        // When false, the channel adapter logs instead of sending (the
        // Notification record is still created).
        NOTIFICATIONS_ENABLED: Joi.boolean().default(true),

        // ── Auth: one JWT secret per purpose (all ≥ 32 chars) ──────────────
        // A token minted for one purpose fails signature verification for any
        // other because the secrets differ; `typ` is a second barrier.
        JWT_DOCTOR_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_DOCTOR_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ADMIN_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_ADMIN_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_EMAIL_VERIFY_SECRET: Joi.string().min(32).required(),
        JWT_PASSWORD_RESET_SECRET: Joi.string().min(32).required(),
        JWT_OAUTH_TICKET_SECRET: Joi.string().min(32).required(),
        // Token lifetimes (jsonwebtoken duration strings).
        JWT_DOCTOR_ACCESS_TTL: Joi.string().default('1h'),
        JWT_DOCTOR_REFRESH_TTL: Joi.string().default('24h'),
        // Base URL of the dashboard — builds email verification / reset links.
        APP_URL: Joi.string().uri().required(),
        // Optional cookie domain (e.g. `.vitale.dz` to share across subdomains).
        COOKIE_DOMAIN: Joi.string().optional(),

        // ── Storage adapter selection ─────────────────────────────────────
        // `r2` wires Cloudflare R2 (S3-compatible); any other value (default)
        // keeps the in-memory fake so the full attachment flow is curl-testable
        // locally with no cloud credentials.
        STORAGE_PROVIDER: Joi.string()
          .valid('in-memory', 'r2')
          .default('in-memory'),
        // Required when STORAGE_PROVIDER=r2.
        R2_ACCOUNT_ID: Joi.string().when('STORAGE_PROVIDER', {
          is: 'r2',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        R2_ACCESS_KEY_ID: Joi.string().when('STORAGE_PROVIDER', {
          is: 'r2',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        R2_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_PROVIDER', {
          is: 'r2',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        R2_PUBLIC_BUCKET: Joi.string().when('STORAGE_PROVIDER', {
          is: 'r2',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        // Optional CDN / public base URL for R2 objects. If unset, the adapter
        // builds the S3 API path (works for public-access buckets).
        R2_PUBLIC_URL: Joi.string().uri().optional(),

        // ── Private bucket (KYC / identity docs) ─────────────────────────
        // Required when STORAGE_PROVIDER=r2. These docs are never served
        // directly; access is via short-lived presigned GET URLs checked
        // against the attachment owner or an admin role.
        R2_PRIVATE_BUCKET: Joi.string().when('STORAGE_PROVIDER', {
          is: 'r2',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        R2_PRIVATE_URL: Joi.string().uri().optional(),

        // ── OAuth (Google) — required only when enabled ────────────────────
        OAUTH_GOOGLE_ENABLED: Joi.boolean().default(false),
        GOOGLE_CLIENT_ID: Joi.string().when('OAUTH_GOOGLE_ENABLED', {
          is: true,
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        GOOGLE_CLIENT_SECRET: Joi.string().when('OAUTH_GOOGLE_ENABLED', {
          is: true,
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        GOOGLE_REDIRECT_URI: Joi.string().uri().when('OAUTH_GOOGLE_ENABLED', {
          is: true,
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
      }),
      validationOptions: {
        // Surface every problem at once rather than failing on the first.
        abortEarly: false,
      },
    }),
  ],
})
export class ConfigModule {}
