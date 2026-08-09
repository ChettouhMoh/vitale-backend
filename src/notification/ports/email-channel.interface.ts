/**
 * IEmailChannel — the email transport port. Implemented by nodemailer today;
 * swappable for a transactional provider (Resend/SES/Postmark) by changing the
 * binding in notification.module.ts.
 */
export interface IEmailChannel {
  send(message: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ providerMessageId: string }>;
}

export const IEmailChannel = Symbol('IEmailChannel');
