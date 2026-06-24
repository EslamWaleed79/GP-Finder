import type { INotificationProvider } from "./INotificationProvider.js";

export class NotificationService {
  constructor(private provider: INotificationProvider) {}

  async notifyConnectionRequest(recipientId: number, senderName: string): Promise<void> {
    await this.provider.notify(
      recipientId,
      `${senderName} sent you a connection request`
    );
  }

  async notifyConnectionAccepted(senderId: number, recipientName: string): Promise<void> {
    await this.provider.notify(
      senderId,
      `${recipientName} accepted your connection request — you can now see their contact info`
    );
  }

  async notifyConnectionDeclined(senderId: number, recipientName: string): Promise<void> {
    await this.provider.notify(
      senderId,
      `${recipientName} declined your connection request`
    );
  }
}
