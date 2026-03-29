// Background service worker for YouTube PiP View extension

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_CURRENT_VIDEO") {
    // Query the active tab for the current YouTube video
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id && tab.url?.includes("youtube.com")) {
        chrome.tabs.sendMessage(
          tab.id,
          { type: "GET_VIDEO_ID" },
          (response) => {
            sendResponse(response);
          }
        );
      } else {
        sendResponse({ videoId: null });
      }
    });
    return true; // Keep message channel open for async response
  }
});

// Listen for tab updates to detect YouTube navigation
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url?.includes("youtube.com/watch")
  ) {
    // Notify popup if open
    chrome.runtime.sendMessage({
      type: "TAB_UPDATED",
      url: tab.url,
    }).catch(() => {
      // Popup not open, ignore
    });
  }
});
