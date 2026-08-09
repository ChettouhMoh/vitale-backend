import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Handlebars from 'handlebars';
import { DomainError } from '@/common/errors/domain.error';
import { NotificationErrorCode } from '@/common/errors/codes';
import { LoggerService } from '@/common/logger/logger.service';
import { ITemplateRenderer } from '../ports';
import { Locale } from '../domain';

type Compiled = ReturnType<typeof Handlebars.compile>;

const LOCALES = ['fr', 'ar', 'en'] as const;

/**
 * Renders `.hbs` templates. Each template's first line is `subject: …`; the rest
 * is the HTML body. Templates are compiled once at bootstrap and cached — never
 * per send. The body is injected into an LTR or RTL layout based on the locale.
 */
@Injectable()
export class HandlebarsTemplateRenderer
  implements ITemplateRenderer, OnModuleInit
{
  private readonly templates = new Map<string, Compiled>(); // `${locale}:${name}`
  private ltrLayout!: Compiled;
  private rtlLayout!: Compiled;

  constructor(private readonly logger: LoggerService) {}

  onModuleInit(): void {
    const root = __dirname; // src/notification/templates (or dist equivalent)
    this.ltrLayout = this.compileFile(
      path.join(root, 'layouts', 'base.ltr.hbs'),
    );
    this.rtlLayout = this.compileFile(
      path.join(root, 'layouts', 'base.rtl.hbs'),
    );

    let count = 0;
    for (const locale of LOCALES) {
      const dir = path.join(root, locale);
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.hbs')) continue;
        const name = file.slice(0, -'.hbs'.length);
        this.templates.set(
          `${locale}:${name}`,
          this.compileFile(path.join(dir, file)),
        );
        count += 1;
      }
    }
    this.logger.info('Notification templates compiled', { count });
  }

  async render(
    templateName: string,
    locale: string,
    data: Record<string, unknown>,
  ): Promise<{ subject: string; html: string; text: string }> {
    const compiled = this.templates.get(`${locale}:${templateName}`);
    if (!compiled) {
      // Deliberately no silent fallback to another locale — a missing
      // translation is a bug. Unknown locale strings are handled by the Locale VO.
      throw new DomainError(
        NotificationErrorCode.TEMPLATE_NOT_FOUND,
        `No template "${templateName}" for locale "${locale}"`,
      );
    }

    try {
      const { subject, body } = this.split(compiled(data));
      const layout = Locale.create(locale).isRtl ? this.rtlLayout : this.ltrLayout;
      const html = layout({ subject, body });
      const text = this.htmlToText(body);
      return { subject, html, text };
    } catch (err) {
      throw new DomainError(
        NotificationErrorCode.TEMPLATE_RENDER_FAILED,
        `Failed to render "${templateName}" (${locale}): ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
    }
  }

  private compileFile(file: string): Compiled {
    return Handlebars.compile(fs.readFileSync(file, 'utf8'));
  }

  /** First line is `subject: …`; everything after the first newline is the body. */
  private split(rendered: string): { subject: string; body: string } {
    const nl = rendered.indexOf('\n');
    const firstLine = nl === -1 ? rendered : rendered.slice(0, nl);
    const rest = nl === -1 ? '' : rendered.slice(nl + 1);
    return {
      subject: firstLine.replace(/^subject:\s*/i, '').trim(),
      body: rest.trim(),
    };
  }

  /** Plaintext fallback — every email needs one, or it scores badly with spam filters. */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Keep link URLs — turn <a href="URL">TEXT</a> into "TEXT (URL)" so the
      // plaintext version still carries a usable link.
      .replace(
        /<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
        '$2 ($1)',
      )
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      // Numeric entities first (Handlebars escapes interpolated values, so a URL
      // like ...?t=abc becomes ...?t&#x3D;abc — the plaintext link must be usable).
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
      .replace(/&#(\d+);/g, (_m, dec: string) =>
        String.fromCodePoint(parseInt(dec, 10)),
      )
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
