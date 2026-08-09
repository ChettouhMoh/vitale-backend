import { Module } from '@nestjs/common';
import { SendNotificationService } from './application';
import {
  AuthNotificationHandlers,
  DoctorNotificationHandlers,
} from './handlers';
import { HandlebarsTemplateRenderer } from './templates';
import {
  ConsolePushChannel,
  ConsoleSmsChannel,
  NodemailerEmailChannel,
} from './infra';
import {
  IEmailChannel,
  IPushChannel,
  ISmsChannel,
  ITemplateRenderer,
} from './ports';

/**
 * The notification bounded context. NOT @Global and exports nothing — nothing
 * imports it. It works purely by subscribing to domain events (its handler
 * classes are providers, which the events HandlerRegistry discovers at boot).
 * It must be imported in app.module so those providers are instantiated.
 */
@Module({
  providers: [
    SendNotificationService,
    AuthNotificationHandlers,
    DoctorNotificationHandlers,
    { provide: ITemplateRenderer, useClass: HandlebarsTemplateRenderer },
    { provide: IEmailChannel, useClass: NodemailerEmailChannel },
    { provide: ISmsChannel, useClass: ConsoleSmsChannel },
    { provide: IPushChannel, useClass: ConsolePushChannel },
  ],
})
export class NotificationModule {}
