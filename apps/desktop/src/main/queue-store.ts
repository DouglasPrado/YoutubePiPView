import { BrowserWindow } from 'electron';
import Store from 'electron-store';
import * as crypto from 'crypto';
import type { QueueItem, QueueState } from '../types/index';

let store: Store | null = null;
let getWindows: (() => { main: BrowserWindow | null; queue: BrowserWindow | null }) | null = null;

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

export function addItemsToQueue(items: Array<{ videoId: string; url: string }>): QueueState {
  const queue = getQueue();
  const newItems: QueueItem[] = items.map((item) => ({
    id: `${item.videoId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    videoId: item.videoId,
    url: item.url,
  }));
  queue.items.push(...newItems);
  saveQueue(queue);
  broadcastQueueUpdate(queue);
  return queue;
}

export function playVideoNow(videoId: string): QueueState {
  const queue = getQueue();
  const newItem: QueueItem = {
    id: `${videoId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
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
