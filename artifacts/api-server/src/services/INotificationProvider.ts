export interface INotificationProvider {
  notify(userId: number, message: string): Promise<void>;
}
