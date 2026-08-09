/** ISmsChannel — SMS transport port. Only a console stub exists today. */
export interface ISmsChannel {
  send(message: {
    to: string;
    text: string;
  }): Promise<{ providerMessageId: string }>;
}

export const ISmsChannel = Symbol('ISmsChannel');
