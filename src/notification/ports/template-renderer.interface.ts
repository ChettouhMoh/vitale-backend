/**
 * ITemplateRenderer — renders a (templateName, locale) pair with data into the
 * three parts every email needs: a subject line, an HTML body, and a plaintext
 * fallback.
 */
export interface ITemplateRenderer {
  render(
    templateName: string,
    locale: string,
    data: Record<string, unknown>,
  ): Promise<{ subject: string; html: string; text: string }>;
}

export const ITemplateRenderer = Symbol('ITemplateRenderer');
