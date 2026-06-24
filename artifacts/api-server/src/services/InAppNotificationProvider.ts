import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import type { INotificationProvider } from "./INotificationProvider.js";

export class InAppNotificationProvider implements INotificationProvider {
  async notify(userId: number, message: string): Promise<void> {
    await db.insert(notificationsTable).values({ userId, message });
  }
}
