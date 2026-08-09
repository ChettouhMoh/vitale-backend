// AppModule validates these on boot (Joi schema); provide safe defaults so
// the module compiles in the test environment.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/vitale_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-that-is-at-least-32-chars-long';
// Notification/SMTP config is required on boot; provide inert defaults and keep
// sending disabled so the app compiles in the test environment.
process.env.NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED ?? 'false';
process.env.SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.example.com';
process.env.SMTP_USER = process.env.SMTP_USER ?? 'test@example.com';
process.env.SMTP_PASSWORD = process.env.SMTP_PASSWORD ?? 'test-password';
process.env.MAIL_FROM_ADDRESS =
  process.env.MAIL_FROM_ADDRESS ?? 'no-reply@example.com';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // 200 when DB + Redis are reachable, 503 otherwise — both prove the app
  // boots and the health route is wired and returns the structured payload.
  it('/health (GET) responds with a structured health payload', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('details');
  });
});
