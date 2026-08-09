import { describe, expect, it, jest, beforeAll } from '@jest/globals';
import { HandlebarsTemplateRenderer } from './handlebars-template-renderer';
import { LoggerService } from '@/common/logger/logger.service';
import { DomainError } from '@/common/errors/domain.error';
import { NotificationErrorCode } from '@/common/errors/codes/notification.errors';

const loggerStub = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as LoggerService;

describe('HandlebarsTemplateRenderer', () => {
  let renderer: HandlebarsTemplateRenderer;

  beforeAll(() => {
    renderer = new HandlebarsTemplateRenderer(loggerStub);
    renderer.onModuleInit(); // compiles the real .hbs files from disk
  });

  it('splits the subject from the body and interpolates data', async () => {
    const out = await renderer.render('password-reset', 'fr', {
      resetLink: 'https://vitale.dz/reset?t=abc',
      expiresAt: '2026-08-10',
    });
    expect(out.subject).toBe('Réinitialisez votre mot de passe');
    // The link is present in the HTML (Handlebars escapes `=` in attributes,
    // which is safe there) and fully usable in the plaintext fallback.
    expect(out.html).toContain('vitale.dz/reset');
    expect(out.text).toContain('https://vitale.dz/reset?t=abc');
    expect(out.html).toContain('2026-08-10');
  });

  it('wraps LTR locales in the LTR layout', async () => {
    const out = await renderer.render('email-verification', 'en', {
      verificationLink: 'https://vitale.dz/v',
      expiresAt: '2026-08-10',
    });
    expect(out.html).toContain('dir="ltr"');
    expect(out.html).not.toContain('dir="rtl"');
  });

  it('wraps Arabic in the RTL layout', async () => {
    const out = await renderer.render('email-verification', 'ar', {
      verificationLink: 'https://vitale.dz/v',
      expiresAt: '2026-08-10',
    });
    expect(out.html).toContain('dir="rtl"');
  });

  it('derives a tag-free plaintext body from the HTML', async () => {
    const out = await renderer.render('password-changed', 'fr', {});
    expect(out.text).not.toContain('<');
    expect(out.text.length).toBeGreaterThan(0);
  });

  it('throws TEMPLATE_NOT_FOUND for a missing (template, locale) pair', async () => {
    await expect(
      renderer.render('does-not-exist', 'fr', {}),
    ).rejects.toBeInstanceOf(DomainError);
    await expect(
      renderer.render('password-reset', 'de', {}),
    ).rejects.toMatchObject({
      code: NotificationErrorCode.TEMPLATE_NOT_FOUND,
    });
  });
});
