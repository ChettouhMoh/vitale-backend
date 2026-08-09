/** IPushChannel — push transport port. Only a console stub exists today. */
export interface IPushChannel {
  send(message: {
    deviceToken: string;
    title: string;
    body: string;
  }): Promise<{ providerMessageId: string }>;
}

export const IPushChannel = Symbol('IPushChannel');
