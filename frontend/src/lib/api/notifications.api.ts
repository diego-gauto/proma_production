import { apiRequest, PaginatedResponse } from './client';

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  order?: { id: string; internalCode?: string; externalCode?: string } | null;
  orderPart?: { id: string; partCode?: string } | null;
  stage?: { id: number; code: string; name: string } | null;
};

export type NotificationsResponse = PaginatedResponse<NotificationItem> & {
  unreadCount: number;
};

export function listNotifications(token: string, unreadOnly = false): Promise<NotificationsResponse> {
  const query = unreadOnly ? '?unreadOnly=true' : '';
  return apiRequest<NotificationsResponse>(`/notifications${query}`, { token });
}

export function markNotificationRead(token: string, id: string): Promise<NotificationItem> {
  return apiRequest<NotificationItem>(`/notifications/${id}/read`, {
    method: 'PATCH',
    token,
  });
}

export function markAllNotificationsRead(token: string): Promise<{ updated: number }> {
  return apiRequest<{ updated: number }>('/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}
