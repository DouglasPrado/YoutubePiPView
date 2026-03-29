// Content script injected on YouTube pages
import { extractVideoId } from "@ytview/youtube-utils";

const DESKTOP_API = "http://localhost:8765";
const PLAYLIST_BTN_ID = "ytview-add-to-queue-btn";

console.log("[YTView] Content script loaded on:", window.location.href);

// ===== Message listener (popup/background) =====

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_VIDEO_ID") {
    sendResponse({ videoId: extractVideoId(window.location.href) });
  }
  if (message.type === "OPEN_PIP") {
    openPictureInPicture(message.videoId);
  }
});

async function openPictureInPicture(videoId: string) {
  const video = document.querySelector("video");
  if (video) {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      await video.requestPictureInPicture();
    } catch {
      openPipWindow(videoId);
    }
  } else {
    openPipWindow(videoId);
  }
}

function openPipWindow(videoId: string) {
  window.open(
    `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
    "ytpip",
    `width=480,height=270,left=${screen.width - 500},top=20,resizable=yes`
  );
}

// ===== API communication =====

async function addToQueue(videoIds: string[]): Promise<void> {
  const items = videoIds.map((id) => ({
    videoId: id,
    url: `https://www.youtube.com/watch?v=${id}`,
  }));
  const response = await fetch(`${DESKTOP_API}/api/queue/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error("Failed to add to queue");
}

// ===== Floating "+" button (appended to document.body, positioned over hovered video) =====

let floatingBtn: HTMLButtonElement | null = null;
let currentVideoId: string | null = null;
let hideTimeout: number | null = null;

function getOrCreateFloatingBtn(): HTMLButtonElement {
  if (floatingBtn) return floatingBtn;

  const btn = document.createElement("button");
  btn.id = "ytview-floating-add";
  Object.assign(btn.style, {
    position: "fixed", zIndex: "99999", display: "none",
    width: "40px", height: "40px", border: "none", borderRadius: "50%",
    background: "rgba(0,0,0,0.8)", color: "#fff", cursor: "pointer",
    padding: "0", alignItems: "center", justifyContent: "center",
    transition: "background 0.15s, transform 0.15s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
  });
  btn.innerHTML = plusSvg();

  btn.addEventListener("mouseenter", () => {
    cancelHide();
    btn.style.background = "#e94560";
    btn.style.transform = "scale(1.15)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "rgba(0,0,0,0.8)";
    btn.style.transform = "";
    scheduleHide();
  });
  btn.addEventListener("click", handleFloatingClick);

  document.body.appendChild(btn);
  floatingBtn = btn;
  return btn;
}

function plusSvg() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
}

function checkSvg() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
}

async function handleFloatingClick(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  const btn = getOrCreateFloatingBtn();
  if (!currentVideoId || btn.dataset.busy === "true") return;

  btn.dataset.busy = "true";
  btn.style.background = "#1a3a5c";

  try {
    await addToQueue([currentVideoId]);
    btn.style.background = "#1b5e20";
    btn.innerHTML = checkSvg();
  } catch {
    btn.style.background = "#b71c1c";
  }

  setTimeout(() => {
    btn.dataset.busy = "false";
    btn.style.background = "rgba(0,0,0,0.8)";
    btn.innerHTML = plusSvg();
  }, 1500);
}

function cancelHide() {
  if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
}

function scheduleHide() {
  cancelHide();
  hideTimeout = window.setTimeout(() => {
    const btn = getOrCreateFloatingBtn();
    btn.style.display = "none";
    currentVideoId = null;
  }, 300);
}

function showFloatingBtn(rect: DOMRect, videoId: string) {
  const btn = getOrCreateFloatingBtn();
  cancelHide();
  currentVideoId = videoId;
  btn.style.top = `${rect.top + 8}px`;
  btn.style.left = `${rect.right - 48}px`;
  btn.style.display = "flex";
}

// Event delegation: detect hover over any video renderer
function setupVideoHoverDetection() {
  const RENDERERS = "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer";

  document.addEventListener("mouseover", (e) => {
    const target = e.target as HTMLElement;
    const renderer = target.closest(RENDERERS);
    if (!renderer) return;

    const link = renderer.querySelector("a[href*='/watch?v=']") as HTMLAnchorElement | null;
    if (!link?.href) return;
    const videoId = extractVideoId(link.href);
    if (!videoId) return;

    showFloatingBtn(renderer.getBoundingClientRect(), videoId);
  });

  // Reposition on scroll (button is position:fixed)
  let scrollRaf = 0;
  window.addEventListener("scroll", () => {
    if (!currentVideoId || !floatingBtn || floatingBtn.style.display === "none") return;
    cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(() => {
      // Hide on scroll - simpler than repositioning
      scheduleHide();
    });
  }, { passive: true });
}

// ===== Playlist "Add all" button =====

function isPlaylistPage(): boolean {
  return window.location.href.includes("youtube.com/playlist") && window.location.search.includes("list=");
}

function extractPlaylistVideoIds(): string[] {
  const selectors = [
    "#contents ytd-playlist-video-renderer a#video-title",
    "#contents ytd-playlist-video-renderer a[href*='/watch?v=']",
    "ytd-playlist-video-list-renderer a[href*='/watch?v=']",
  ];
  const ids: string[] = [];
  for (const sel of selectors) {
    const links = document.querySelectorAll(sel);
    if (links.length > 0) {
      links.forEach((link) => {
        const id = extractVideoId((link as HTMLAnchorElement).href);
        if (id && !ids.includes(id)) ids.push(id);
      });
      break;
    }
  }
  return ids;
}

function injectPlaylistButton() {
  if (document.getElementById(PLAYLIST_BTN_ID)) return;
  if (!isPlaylistPage()) return;

  const btn = document.createElement("button");
  btn.id = PLAYLIST_BTN_ID;
  Object.assign(btn.style, {
    position: "fixed", bottom: "24px", right: "24px", zIndex: "99999",
    display: "inline-flex", alignItems: "center", gap: "8px",
    padding: "12px 20px", border: "none", borderRadius: "24px",
    background: "#e94560", color: "#fff", cursor: "pointer",
    fontFamily: "Roboto, Arial, sans-serif", fontSize: "14px", fontWeight: "500",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  });
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg><span>Add all to YTView</span>`;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const span = btn.querySelector("span")!;
    const ids = extractPlaylistVideoIds();
    if (!ids.length) { span.textContent = "No videos found"; return; }

    btn.disabled = true;
    span.textContent = "Adding...";
    try {
      await addToQueue(ids);
      span.textContent = `Added ${ids.length} videos!`;
      btn.style.background = "#1b5e20";
    } catch {
      span.textContent = "Failed";
      btn.style.background = "#b71c1c";
    }
    setTimeout(() => {
      btn.disabled = false;
      span.textContent = "Add all to YTView";
      btn.style.background = "#e94560";
    }, 2500);
  });

  document.body.appendChild(btn);
}

// ===== Init =====

function onNavigate() {
  if (!isPlaylistPage()) {
    document.getElementById(PLAYLIST_BTN_ID)?.remove();
  }
  if (isPlaylistPage()) {
    injectPlaylistButton();
  }
}

document.addEventListener("yt-navigate-finish", onNavigate);
window.addEventListener("popstate", () => setTimeout(onNavigate, 500));

// Start hover detection and initial navigation check
setupVideoHoverDetection();
onNavigate();
