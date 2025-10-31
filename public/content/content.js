// SuperBook Content Script - Enhanced with Gemini AI
// Adds a hover button above selected words that, when clicked, shows a tooltip with the definition

console.log("SuperBook content script loaded");

let hoverButtonEl = null;
let tooltipEl = null;
let hideHoverTimeout = null;
let isInteracting = false;
let enabled = true;
let lastSelectionRect = null;
let isInitialized = false;
let aiMode = false;
let geminiApiKey = null;
let geminiModel = "gemini-2.5-flash-lite";
let selectedWord = null;
let paragraphContext = null;
let contextSize = "medium";
let tooltipTheme = "dark";
let tooltipSize = "medium";
let fontSize = "medium";

const FETCH_TIMEOUT = 5000;
const MAX_RETRIES = 2;

function initializeSuperBook() {
  // Prevent duplicate initialization
  if (isInitialized) {
    console.log("SuperBook already initialized, skipping...");
    return;
  }
  isInitialized = true;
  document.addEventListener("mouseup", onMouseUpOrKeySelection, true);
  document.addEventListener("keyup", onMouseUpOrKeySelection, true);
  document.addEventListener("selectionchange", onSelectionChange);
  window.addEventListener("scroll", onScrollReposition, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      removeTooltip();
      hideHoverButton();
    }
  });

  // Load settings from storage
  loadSettings();

  try {
    chrome.runtime.sendMessage({ action: "getSettings" }, (res) => {
      if (res && typeof res.enabled !== "undefined") {
        enabled = !!res.enabled;
      }
    });
  } catch (_) {}

  // Inject minimal terminal styles for tooltips into the host page
  injectTerminalStyles();

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.action === "toggleExtension") {
        enabled = !!message.enabled;
        if (!enabled) {
          hideHoverButton();
          removeTooltip();
        }
      }
      // Listen for settings updates
      if (message && message.action === "settingsUpdated") {
        loadSettings();
      }
    });
  } catch (_) {}
}

function injectTerminalStyles() {
  if (document.getElementById("superbook-terminal-styles")) return;
  const style = document.createElement("style");
  style.id = "superbook-terminal-styles";
  style.textContent = `
    .terminal-tooltip .terminal-loading-dots::after { content: ''; display:inline-block; animation: dots 1s steps(3,end) infinite; width: 1.2em; }
    @keyframes dots { 0%,20% { content: ''; } 40% { content: '.';} 60% { content: '..'; } 80%,100% { content: '...'; } }
    .terminal-tooltip { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace; }
    .superbook-terminal-window { background:#071018;border-radius:6px;padding:8px;margin-top:8px;border:1px solid rgba(74,222,128,0.06); }
    .superbook-terminal-header { display:flex;align-items:center;gap:8px;padding:4px 6px 8px 6px; }
    .superbook-terminal-header .dot { width:10px;height:10px;border-radius:50%; }
    .superbook-terminal-header .dot.red { background:#ef4444 }
    .superbook-terminal-header .dot.yellow { background:#f59e0b }
    .superbook-terminal-header .dot.green { background:#4ade80 }
    .superbook-terminal-body { background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0)); padding:8px;border-radius:4px;margin-top:6px;color:#d1d5db;font-size:13px;line-height:1.5 }
    /* Popup-like terminal card */
    .superbook-terminal-card { background: #0b1220; border-radius: 12px; padding: 8px; box-shadow: 0 10px 30px rgba(2,6,23,0.6); border: 1px solid rgba(255,255,255,0.02); font-family: 'Fira Code', 'Courier New', monospace; }
    .superbook-terminal-card .card-header { display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.02); }
    .terminal-dots { display:flex; gap:6px; align-items:center; }
    .terminal-dot { width:10px; height:10px; border-radius:50%; }
    .terminal-dot.red { background: #ff5f56; }
    .terminal-dot.yellow { background: #ffbd2e; }
    .terminal-dot.green { background: #27ca3f; }
    .terminal-title { font-size: 13px; color: #9aa2b1; font-weight: 500; }
    .superbook-terminal-badge { background: rgba(34,197,94,0.08); color: #4ade80; padding:6px 10px; border-radius:8px; font-weight:700; font-size:12px; display:inline-flex; gap:8px; align-items:center; }
    .superbook-terminal-inner { margin:10px;padding:12px;border-radius:8px;background:#071018;border:1px solid rgba(74,222,128,0.08); }
    .superbook-terminal-inner p { margin:0;color:#d1d5db }
    .superbook-terminal-word { font-weight:700;color:#93f9b9;margin-bottom:6px }
    .superbook-terminal-subtle { color:#9ca3af;font-size:13px }
  `;
  document.head.appendChild(style);
}

function loadSettings() {
  chrome.storage.local.get(
    [
      "geminiApiKey",
      "geminiModel",
      "aiMode",
      "contextSize",
      "tooltipTheme",
      "tooltipSize",
      "fontSize",
    ],
    (result) => {
      geminiApiKey = result.geminiApiKey || null;
      geminiModel = result.geminiModel || "gemini-2.5-flash-lite";
      contextSize = result.contextSize || "medium";
      tooltipTheme = result.tooltipTheme || "dark";
      tooltipSize = result.tooltipSize || "medium";
      fontSize = result.fontSize || "medium";
      aiMode = result.aiMode !== false && !!result.geminiApiKey; // Enable AI mode only if API key exists
    }
  );
}

function onSelectionChange() {
  clearTimeout(hideHoverTimeout);
  hideHoverTimeout = setTimeout(() => {
    updateHoverFromCurrentSelection();
  }, 80);
}

function onMouseUpOrKeySelection() {
  const selection = window.getSelection();
  if (!selection) return hideHoverButton();
  updateHoverFromCurrentSelection();
}

function isValidSelection(selection) {
  if (!enabled) return false;
  if (!selection || selection.isCollapsed) return false;

  const anchorNode = selection.anchorNode && selection.anchorNode.parentElement;
  if (
    anchorNode &&
    anchorNode.closest("input, textarea, [contenteditable=true]")
  )
    return false;

  const text = selection.toString().trim();
  if (!text) return false;
  if (text.split(/\s+/).length !== 1) return false;
  if (text.length < 2) return false;
  return true;
}

function getParagraphContext(selection) {
  try {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // Get parent paragraph element
    let paragraph = container;
    while (paragraph && paragraph.nodeType !== 1) {
      paragraph = paragraph.parentNode;
    }

    // Find the paragraph parent
    while (
      paragraph &&
      paragraph.tagName &&
      paragraph.tagName.toLowerCase() !== "p"
    ) {
      paragraph = paragraph.parentElement;
    }

    // Get text content of the paragraph
    const paragraphText = paragraph ? paragraph.textContent.trim() : "";

    // Determine context size based on setting
    let maxLength = 500; // default medium
    if (contextSize === "small") {
      maxLength = 200; // 1-2 sentences
    } else if (contextSize === "medium") {
      maxLength = 500; // paragraph
    } else if (contextSize === "large") {
      maxLength = 1000; // 2-3 paragraphs
    } else if (contextSize === "auto") {
      // Intelligent auto-sizing based on content
      maxLength = paragraphText.length || 500;
    }

    // If no paragraph found, get surrounding context from the container
    if (!paragraph || paragraphText.length < 50) {
      const containerElement =
        container.nodeType === 1 ? container : container.parentElement;
      if (containerElement) {
        return containerElement.textContent.trim().substring(0, maxLength);
      }
    }

    return (
      paragraphText.substring(0, maxLength) ||
      document.body.textContent.trim().substring(0, maxLength)
    );
  } catch (e) {
    console.error("Error getting paragraph context:", e);
    return document.body.textContent.trim().substring(0, 500);
  }
}

function updateHoverFromCurrentSelection() {
  const selection = window.getSelection();
  if (!isValidSelection(selection)) {
    hideHoverButton();
    lastSelectionRect = null;
    return;
  }
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    hideHoverButton();
    lastSelectionRect = null;
    return;
  }
  lastSelectionRect = rect;

  // Get context for AI mode
  selectedWord = selection.toString().trim();
  paragraphContext = getParagraphContext(selection);

  const x = rect.left + rect.width / 2 + window.scrollX;
  const y = rect.top + window.scrollY;
  showHoverButton({ x, y }, selectedWord);
}

function onScrollReposition() {
  if (!hoverButtonEl || hoverButtonEl.style.display === "none") return;
  if (!lastSelectionRect) return hideHoverButton();
  const rect = lastSelectionRect;
  const x = rect.left + rect.width / 2 + window.scrollX;
  const y = rect.top + window.scrollY;
  positionHoverButton({ x, y });
}

function createHoverButton() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "superbook-hover-btn";
  btn.setAttribute("aria-label", "Show definition");

  const logo = document.createElement("div");
  logo.style.width = "18px";
  logo.style.height = "18px";
  logo.style.borderRadius = "50%";
  logo.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  logo.style.display = "flex";
  logo.style.alignItems = "center";
  logo.style.justifyContent = "center";
  logo.style.color = "white";
  logo.style.fontSize = "10px";
  logo.style.fontWeight = "bold";
  logo.textContent = "📚";
  logo.setAttribute("aria-label", "SuperBook");
  btn.appendChild(logo);

  btn.addEventListener("mousedown", (e) => {
    isInteracting = true;
    e.preventDefault();
  });

  btn.addEventListener("click", () => {
    const word = btn.dataset.word || "";
    const bx = Number(btn.dataset.x || 0);
    const by = Number(btn.dataset.y || 0);
    showTooltip(word, { x: bx, y: by });
    setTimeout(() => {
      isInteracting = false;
    }, 50);
  });

  document.documentElement.appendChild(btn);
  return btn;
}

function showHoverButton(position, word) {
  if (!hoverButtonEl) {
    hoverButtonEl = createHoverButton();
  }

  positionHoverButton(position);
  hoverButtonEl.style.display = "flex";
  hoverButtonEl.dataset.word = word;
  hoverButtonEl.dataset.x = String(position.x);
  hoverButtonEl.dataset.y = String(position.y);
}

function positionHoverButton(position) {
  const offsetY = 10;
  hoverButtonEl.style.left = `${Math.round(position.x - 16)}px`;
  hoverButtonEl.style.top = `${Math.round(position.y - offsetY - 32)}px`;
}

function hideHoverButton() {
  if (isInteracting) return;
  if (hoverButtonEl) hoverButtonEl.style.display = "none";
}

function removeTooltip() {
  if (tooltipEl && tooltipEl.parentNode) {
    tooltipEl.parentNode.removeChild(tooltipEl);
  }
  tooltipEl = null;
}

async function fetchDictionaryDefinition(word) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
      word.toLowerCase()
    )}`,
    { signal: controller.signal }
  );

  clearTimeout(timeout);

  if (!res.ok) {
    if (res.status === 404) throw new Error("Word not found");
    throw new Error("Server returned error");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Malformed response from server");
  }

  if (!Array.isArray(data) || !data[0] || !data[0].meanings) {
    throw new Error("Invalid API response");
  }

  const entry = data[0];
  const meaning = entry.meanings[0];
  const def = meaning.definitions[0];

  return {
    word: entry.word,
    phonetic: entry.phonetic || entry.phonetics?.[0]?.text || "",
    partOfSpeech: meaning.partOfSpeech || "",
    definition: def.definition || "",
    example: def.example || "",
  };
}

async function fetchAIContextualMeaning(word, context) {
  if (!geminiApiKey || !aiMode) {
    return null;
  }

  try {
    const prompt = `Analyze the word "${word}" within this specific context and explain its meaning. Focus on:
1. What the word means in THIS context
2. Why this word was chosen here specifically
3. What nuance or connotation it adds to the sentence

Context: "${context}"

Important: If you're uncertain about the word or its meaning in this context, provide your best educated interpretation based on the surrounding context. Do NOT say "word not found" or similar. Always provide a helpful response that explains what the word might mean based on the context.

Provide a brief, insightful explanation (2-3 sentences max) that helps the reader understand what the word means in this context. Be specific and contextual.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Use v1 API for Gemini 2.5 models
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error("AI API error");
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Contextual meaning not available.";

    return text;
  } catch (error) {
    console.error("AI fetch error:", error);
    return null;
  }
}

async function showTooltip(word, position) {
  removeTooltip();

  // Apply customizable styles based on settings
  const tooltipWidths = {
    small: 280,
    medium: 340,
    large: 400,
  };
  const tooltipWidth = tooltipWidths[tooltipSize] || 340;

  tooltipEl = document.createElement("div");
  tooltipEl.className = "superbook-tooltip terminal-tooltip";
  // Terminal-style positioning
  tooltipEl.style.left = `${Math.min(
    position.x + 8,
    window.scrollX + document.documentElement.clientWidth - tooltipWidth
  )}px`;
  tooltipEl.style.top = `${Math.max(position.y - 8, window.scrollY + 8)}px`;

  // Apply customizable font size (we'll use monospace terminal look)
  const fontSizes = {
    small: "12px",
    medium: "13px",
    large: "15px",
  };
  tooltipEl.style.fontSize = fontSizes[fontSize] || "13px";

  // Basic inline terminal styles to avoid external CSS dependency
  tooltipEl.style.cssText += `;color: #e5e7eb; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace; width: ${tooltipWidth}px; z-index: 2147483647;`;

  // Build popup-like terminal card structure
  const card = document.createElement("div");
  card.className = "superbook-terminal-card";

  const header = document.createElement("div");
  header.className = "card-header";

  const dots = document.createElement("div");
  dots.className = "terminal-dots";
  const d1 = document.createElement("span");
  d1.className = "terminal-dot red";
  const d2 = document.createElement("span");
  d2.className = "terminal-dot yellow";
  const d3 = document.createElement("span");
  d3.className = "terminal-dot green";
  dots.appendChild(d1);
  dots.appendChild(d2);
  dots.appendChild(d3);

  const title = document.createElement("div");
  title.className = "terminal-title";
  title.textContent = "Dictionary Terminal";

  const badge = document.createElement("div");
  badge.className = "superbook-terminal-badge";
  badge.innerHTML = '<span style="font-size:14px">🤖</span><span style="margin-left:6px">AI</span>';

  header.appendChild(dots);
  header.appendChild(title);
  header.appendChild(badge);
  card.appendChild(header);

  const inner = document.createElement("div");
  inner.className = "superbook-terminal-inner";

  const content = document.createElement("div");
  content.className = "superbook-definition terminal-content";

  card.appendChild(inner);
  inner.appendChild(content);
  tooltipEl.appendChild(card);

  // Loading state in terminal-like inner panel (keeps monospace look)
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:6px 0;">
      <div style="display:flex;gap:6px;align-items:center;">
        <div style="width:8px;height:8px;border-radius:50%;background:#4ade80"></div>
        <div style="color:#4ade80;font-weight:600;font-size:13px;">AI Analysis</div>
      </div>
      <div style="margin-left:auto;color:#9ca3af;font-size:12px;">${escapeHtml(word)}</div>
    </div>
    <div style="padding-top:8px;color:#9ca3af;font-size:13px;">Analyzing context<span class="terminal-loading-dots">...</span></div>
  `;
  document.documentElement.appendChild(tooltipEl);
  tooltipEl.classList.add("show");

  try {
    // Fetch dictionary definition (fallback) and AI explanation in parallel
    const dictPromise = fetchDictionaryDefinition(word).catch((err) => {
      console.warn("Dictionary fetch failed:", err);
      return null;
    });

    if (!paragraphContext) {
      paragraphContext = `The word "${word}" appears on this page. Please provide a general explanation of what this word means and how it might be used.`;
    }

    const aiPromise = (async () => {
      if (!aiMode || !geminiApiKey) return null;
      try {
        return await fetchAIContextualMeaning(word, paragraphContext);
      } catch (err) {
        console.warn("AI fetch failed:", err);
        return null;
      }
    })();

    const [def, aiMeaning] = await Promise.all([dictPromise, aiPromise]);

    // If neither source returned useful content, show friendly message
    if (!def && !aiMeaning) {
      content.innerHTML = `<div style="text-align: center; padding: 16px; color: #9ca3af;">Unable to fetch definition or contextual meaning. Check your connection or API key.</div>`;
    } else {
      // Render combined content: dictionary definition + AI contextual meaning (if available)
      renderTooltipContent(content, def || {}, aiMeaning || null, word);
    }
  } catch (err) {
    console.error(err);

    let msg;
    if (err.name === "AbortError") msg = "AI analysis timed out. Retrying...";
    else if (err instanceof TypeError)
      msg = "Connection issue. Check your internet.";
    else if (typeof err.message === "string") msg = err.message;
    else msg = "Analyzing your request...";

    // Friendly AI-style error message
    content.innerHTML = `<div style="text-align: center; padding: 24px;">
      <div style="font-size: 24px; margin-bottom: 12px;">🤖</div>
      <div style="font-weight: 600; margin-bottom: 6px;">Processing...</div>
      <div style="font-size: 13px; color: #9ca3af;">${escapeHtml(msg)}</div>
      <div style="margin-top: 12px; padding: 6px 12px; background: rgba(239, 68, 68, 0.1); border-radius: 4px; font-size: 11px; color: #ef4444; display: inline-block;">
        Please try again in a moment
      </div>
    </div>`;
    tooltipEl.classList.add("show");
  }

  const onDocClick = (ev) => {
    const target = ev.target;
    if (!tooltipEl) return;
    if (
      tooltipEl.contains(target) ||
      (hoverButtonEl && hoverButtonEl.contains(target))
    )
      return;
    removeTooltip();
    document.removeEventListener("click", onDocClick, true);
  };
  document.addEventListener("click", onDocClick, true);
}

function renderTooltipContent(content, def, aiMeaning, word) {
  content.innerHTML = "";

  // Outer word header (matches popup)
  if (def && def.word) {
    const wordEl = document.createElement("div");
    wordEl.className = "superbook-terminal-word";
    wordEl.textContent = def.word.toUpperCase();
    content.appendChild(wordEl);
  }

  // Subtle phonetic/pos line
  const metaLine = document.createElement("div");
  metaLine.className = "superbook-terminal-subtle";
  const parts = [];
  if (def && def.phonetic) parts.push(def.phonetic);
  if (def && def.partOfSpeech) parts.push(`[${def.partOfSpeech}]`);
  if (parts.length) metaLine.textContent = parts.join(" • ");
  if (parts.length) content.appendChild(metaLine);

  // Inner boxed panel for definition and AI content
  const innerPanel = document.createElement("div");
  innerPanel.className = "superbook-terminal-inner";

  if (def && def.definition) {
    const p = document.createElement("p");
    p.textContent = def.definition;
    innerPanel.appendChild(p);
  }

  if (def && def.example) {
    const ex = document.createElement("p");
    ex.style.fontStyle = "italic";
    ex.style.opacity = "0.9";
    ex.textContent = `"${def.example}"`;
    innerPanel.appendChild(ex);
  }

  // Append dictionary inner panel first
  content.appendChild(innerPanel);

  // If AI meaning present, append a terminal-styled AI block below
  if (aiMeaning) {
    const aiTerminal = document.createElement("div");
    aiTerminal.className = "superbook-terminal-window";
    const header = document.createElement("div");
    header.className = "superbook-terminal-header";
    const r = document.createElement("div");
    r.className = "dot red";
    const y = document.createElement("div");
    y.className = "dot yellow";
    const g = document.createElement("div");
    g.className = "dot green";
    header.appendChild(r);
    header.appendChild(y);
    header.appendChild(g);
    aiTerminal.appendChild(header);

    const body = document.createElement("div");
    body.className = "superbook-terminal-body";
    body.textContent = aiMeaning;
    aiTerminal.appendChild(body);

    content.appendChild(aiTerminal);
  }
}

function renderAIContent(content, word, aiMeaning) {
  content.innerHTML = "";

  // Card-like presentation for AI full content
  const card = document.createElement("div");
  card.className = "superbook-terminal-card";

  const cardHeader = document.createElement("div");
  cardHeader.className = "card-header";
  const badge = document.createElement("div");
  badge.className = "superbook-terminal-badge";
  badge.innerHTML = '<span style="font-size:14px">🤖</span><span style="margin-left:6px">AI-GENERATED CONTEXT</span>';
  cardHeader.appendChild(badge);
  card.appendChild(cardHeader);

  const inner = document.createElement("div");
  inner.className = "superbook-terminal-inner";
  const p = document.createElement("p");
  p.textContent = aiMeaning;
  inner.appendChild(p);
  card.appendChild(inner);

  content.appendChild(card);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSuperBook);
} else {
  initializeSuperBook();
}
