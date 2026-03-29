// Content script injected on YouTube pages

import { extractVideoId } from "@ytview/youtube-utils";

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_VIDEO_ID") {
    const videoId = getCurrentVideoId();
    sendResponse({ videoId });
  }

  if (message.type === "OPEN_PIP") {
    openPictureInPicture(message.videoId);
  }
});

function getCurrentVideoId(): string | null {
  const url = window.location.href;
  return extractVideoId(url);
}

async function openPictureInPicture(videoId: string) {
  // Try to find the existing YouTube video element
  const video = document.querySelector("video");

  if (video) {
    try {
      // Use the native Picture-in-Picture API
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      await video.requestPictureInPicture();
    } catch (err) {
      console.error("Failed to enter PiP mode:", err);
      // Fallback: open in a small popup window
      openPipWindow(videoId);
    }
  } else {
    openPipWindow(videoId);
  }
}

function openPipWindow(videoId: string) {
  const width = 480;
  const height = 270;
  const left = screen.width - width - 20;
  const top = 20;

  window.open(
    `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
    "ytpip",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes`
  );
}
