// Chrome storage wrapper for the extension

const STORAGE_KEYS = {
  LAST_VIDEO_ID: "lastVideoId",
} as const;

export async function getStoredVideoId(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_VIDEO_ID);
  return result[STORAGE_KEYS.LAST_VIDEO_ID] ?? null;
}

export async function saveVideoId(videoId: string): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.LAST_VIDEO_ID]: videoId,
  });
}

export async function clearStorage(): Promise<void> {
  await chrome.storage.local.clear();
}
