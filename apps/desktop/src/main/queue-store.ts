import { BrowserWindow } from 'electron';
import Store from 'electron-store';
import * as crypto from 'crypto';
import type { QueueItem, QueueState } from '../types/index';

let store: Store | null = null;
let getWindows: (() => { main: BrowserWindow | null; queue: BrowserWindow | null }) | null = null;

async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  const fetchFn = globalThis.fetch;
  if (!fetchFn) return null;

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const endpoints = [
    `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
    `https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`,
  ];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetchFn(endpoint, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'YTView/1.0',
        },
      });
      if (!response.ok) continue;

      const data = await response.json() as { title?: unknown };
      if (typeof data.title === 'string' && data.title.trim()) {
        return data.title.trim();
      }
    } catch {
      // Ignore and try next endpoint
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

async function resolveQueueItemTitle(item: { videoId: string; title?: string }): Promise<string> {
  const providedTitle = item.title?.trim();
  if (providedTitle) return providedTitle;

  const fetchedTitle = await fetchYouTubeTitle(item.videoId);
  return fetchedTitle ?? item.videoId;
}

export function initQueueStore(
  electronStore: Store,
  windowsGetter: () => { main: BrowserWindow | null; queue: BrowserWindow | null }
): void {
  store = electronStore;
  getWindows = windowsGetter;
}

export function getQueue(): QueueState {
  return (store!.get('queue') as QueueState) || { items: [], currentIndex: -1 };
}

export function saveQueue(state: QueueState): void {
  store!.set('queue', state);
}

export function broadcastQueueUpdate(state: QueueState): void {
  if (!getWindows) return;
  const { main, queue } = getWindows();
  if (queue && !queue.isDestroyed()) {
    queue.webContents.send('queue-updated', state);
  }
  if (main && !main.isDestroyed()) {
    main.webContents.send('queue-updated', state);
  }
}

export async function addItemsToQueue(items: Array<{ videoId: string; url: string; title?: string }>): Promise<QueueState> {
  const queue = getQueue();
  const resolvedItems = await Promise.all(
    items.map(async (item) => ({
      ...item,
      title: await resolveQueueItemTitle(item),
    }))
  );

  const newItems: QueueItem[] = resolvedItems.map((item) => ({
    id: `${item.videoId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    videoId: item.videoId,
    url: item.url,
    title: item.title,
  }));
  queue.items.push(...newItems);
  saveQueue(queue);
  broadcastQueueUpdate(queue);
  return queue;
}

export async function hydrateQueueTitles(): Promise<QueueState> {
  const queue = getQueue();
  if (queue.items.length === 0) return queue;

  let changed = false;
  const hydratedItems = await Promise.all(
    queue.items.map(async (item) => {
      const currentTitle = item.title?.trim();
      const needsHydration = !currentTitle || currentTitle === item.videoId;
      if (!needsHydration) return item;

      const resolvedTitle = await resolveQueueItemTitle({ videoId: item.videoId, title: item.title });
      if (resolvedTitle !== item.title) changed = true;
      return {
        ...item,
        title: resolvedTitle,
      };
    })
  );

  if (changed) {
    queue.items = hydratedItems;
    saveQueue(queue);
    broadcastQueueUpdate(queue);
  }

  return queue;
}

export function playVideoNow(videoId: string): QueueState {
  const queue = getQueue();
  const newItem: QueueItem = {
    id: `${videoId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: videoId,
  };
  queue.items.push(newItem);
  queue.currentIndex = queue.items.length - 1;
  saveQueue(queue);

  if (getWindows) {
    const { main } = getWindows();
    if (main && !main.isDestroyed()) {
      main.webContents.send('play-video', videoId);
      main.show();
      main.focus();
    }
  }

  broadcastQueueUpdate(queue);
  return queue;
}
