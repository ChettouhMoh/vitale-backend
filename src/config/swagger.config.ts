import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Swagger / OpenAPI document configuration.
 *
 * NOTE — intentionally NO auth scheme is registered here.
 * Vitale authenticates with an HTTP-only JWT cookie and serves the API
 * with `credentials: true`. Browsers (and the Swagger "Try it out" UI,
 * when run same-site) send that cookie automatically, so there is no
 * Authorization header to document. Adding `addBearerAuth()` would be
 * misleading and is deliberately omitted.
 */
export const swaggerConfig = new DocumentBuilder()
  .setTitle('Vitale API')
  .setDescription('Vitale digital health platform — internal API documentation')
  .setVersion('1.0')
  .build();
