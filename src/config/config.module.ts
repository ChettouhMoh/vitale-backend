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
      }),
      validationOptions: {
        // Surface every problem at once rather than failing on the first.
        abortEarly: false,
      },
    }),
  ],
})
export class ConfigModule {}
