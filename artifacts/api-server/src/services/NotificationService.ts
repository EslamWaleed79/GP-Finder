import type { INotificationProvider } from "./INotificationProvider.js";

export class NotificationService {
  constructor(private provider: INotificationProvider) {}

  async notifyConnectionRequest(recipientId: number, senderId: number, senderName: string): Promise<void> {
    await this.provider.notify(recipientId, `connection_request:${senderId}:${senderName} requested to connect`);
  }

  async notifyConnectionAccepted(senderId: number, recipientName: string): Promise<void> {
    await this.provider.notify(senderId, `${recipientName} accepted your connection request — you can now see their contact info`);
  }

  async notifyConnectionDeclined(senderId: number, recipientName: string): Promise<void> {
    await this.provider.notify(senderId, `${recipientName} declined your connection request`);
  }

  async notifyRaw(userId: number, message: string): Promise<void> {
    await this.provider.notify(userId, message);
  }
}
