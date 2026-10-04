import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from './notifications.api';

test('notification API uses authenticated notification endpoints', async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method?: string; authorization?: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method,
      authorization: new Headers(init?.headers).get('Authorization'),
    });
    return new Response(JSON.stringify({ items: [], total: 0, page: 1, limit: 20, unreadCount: 0, updated: 0, id: 'n1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await listNotifications('token', true);
    await markNotificationRead('token', 'n1');
    await markAllNotificationsRead('token');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls[0].url.endsWith('/notifications?unreadOnly=true'), true);
  assert.equal(calls[1].url.endsWith('/notifications/n1/read'), true);
  assert.equal(calls[1].method, 'PATCH');
  assert.equal(calls[2].url.endsWith('/notifications/read-all'), true);
  assert.equal(calls[2].method, 'PATCH');
  assert.equal(calls.every((call) => call.authorization === 'Bearer token'), true);
});
