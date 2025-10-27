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
  tooltipEl.className = "superbook-tooltip";
  tooltipEl.style.left = `${Math.min(
    position.x + 8,
    window.scrollX + document.documentElement.clientWidth - tooltipWidth
  )}px`;
  tooltipEl.style.top = `${Math.max(position.y - 8, window.scrollY + 8)}px`;

  // Apply customizable font size
  const fontSizes = {
    small: "12px",
    medium: "14px",
    large: "16px",
  };
  tooltipEl.style.fontSize = fontSizes[fontSize] || "14px";

  // Apply theme
  if (tooltipTheme === "light") {
    tooltipEl.classList.add("superbook-tooltip-light");
  }

  const content = document.createElement("div");
  content.className = "superbook-definition";

  // Check if AI mode is enabled
  if (!aiMode || !geminiApiKey) {
    content.innerHTML = `<div style="text-align: center; padding: 24px;">
      <div style="font-size: 32px; margin-bottom: 12px;">🤖</div>
      <div style="font-weight: 600; font-size: 16px; margin-bottom: 6px; color: #4ade80;">AI Mode Required</div>
      <div style="font-size: 13px; color: #9ca3af; line-height: 1.5;">Enable AI mode and configure your API key in settings<br/>to get AI-powered contextual meanings.</div>
      <div style="margin-top: 12px; padding: 8px 16px; background: rgba(74, 222, 128, 0.1); border-radius: 6px; font-size: 12px; color: #4ade80; display: inline-block;">
        Open Settings → Enable AI Mode
      </div>
    </div>`;
    tooltipEl.appendChild(content);
    document.documentElement.appendChild(tooltipEl);
    tooltipEl.classList.add("show");
    return;
  }

  // Show loading state with AI branding
  content.innerHTML = `<div style="text-align: center; padding: 24px;">
    <div style="margin-bottom: 16px;">
      <div class="superbook-loading" style="display: inline-block; font-size: 24px; animation: pulse 1.5s ease-in-out infinite;">🤖</div>
    </div>
    <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
      ${escapeHtml(word)}
    </div>
    <div style="font-size: 13px; color: #9ca3af;">AI is analyzing the context...</div>
  </div>`;
  tooltipEl.appendChild(content);
  document.documentElement.appendChild(tooltipEl);
  tooltipEl.classList.add("show");

  try {
    // Only fetch AI contextual meaning
    if (!paragraphContext) {
      // Still try to get AI explanation even without context
      paragraphContext = `The word "${word}" appears on this page. Please provide a general explanation of what this word means and how it might be used.`;
    }

    const aiMeaning = await fetchAIContextualMeaning(word, paragraphContext);

    if (aiMeaning) {
      // Render AI content only
      renderAIContent(content, word, aiMeaning);
    } else {
      // AI failed but give helpful message
      content.innerHTML = `<div style="text-align: center; padding: 24px;">
        <div style="font-size: 24px; margin-bottom: 12px;">🤖</div>
        <div style="font-weight: 600; margin-bottom: 6px;">Unable to analyze</div>
        <div style="font-size: 13px; color: #9ca3af;">Check your API key and connection.</div>
        <div style="margin-top: 12px; padding: 6px 12px; background: rgba(74, 222, 128, 0.1); border-radius: 4px; font-size: 11px; color: #4ade80; display: inline-block;">
          Try selecting text with more context
        </div>
      </div>`;
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

  // Dictionary definition
  const dictSection = document.createElement("div");
  dictSection.className = "superbook-dict-section";
  const parts = [];

  if (def.word)
    parts.push(`<div class="superbook-word">${escapeHtml(def.word)}</div>`);
  if (def.phonetic)
    parts.push(
      `<div class="superbook-pronunciation">${escapeHtml(def.phonetic)}</div>`
    );
  if (def.partOfSpeech)
    parts.push(
      `<div class="superbook-definition"><strong>${escapeHtml(
        def.partOfSpeech
      )}</strong></div>`
    );
  if (def.definition)
    parts.push(
      `<div class="superbook-definition">${escapeHtml(def.definition)}</div>`
    );
  if (def.example)
    parts.push(
      `<div class="superbook-definition" style="opacity:.8;font-style:italic; margin-top: 4px;">"${escapeHtml(
        def.example
      )}"</div>`
    );

  dictSection.innerHTML = parts.join("");

  // AI contextual meaning with enhanced styling
  if (aiMeaning) {
    const aiSection = document.createElement("div");
    aiSection.className = "superbook-ai-section";

    // Create AI badge
    const aiBadge = document.createElement("div");
    aiBadge.className = "superbook-ai-badge";
    aiBadge.textContent = "AI Context";

    // Create AI content
    const aiContent = document.createElement("div");
    aiContent.style.cssText =
      "font-size: 13px; line-height: 1.6; color: #d1d5db;";
    aiContent.textContent = aiMeaning;

    aiSection.appendChild(aiBadge);
    aiSection.appendChild(aiContent);

    dictSection.appendChild(aiSection);
  }

  content.appendChild(dictSection);
}

function renderAIContent(content, word, aiMeaning) {
  content.innerHTML = "";

  // Main container with padding
  const container = document.createElement("div");
  container.style.cssText = "padding: 8px 0;";

  // Word header with AI branding
  const wordHeader = document.createElement("div");
  wordHeader.style.cssText =
    "margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid rgba(74, 222, 128, 0.15); position: relative;";

  const wordTitle = document.createElement("div");
  wordTitle.className = "superbook-word";
  wordTitle.textContent = word;
  wordTitle.style.marginBottom = "8px";
  wordHeader.appendChild(wordTitle);

  // AI badge with icon
  const aiBadge = document.createElement("div");
  aiBadge.className = "superbook-ai-badge";
  aiBadge.innerHTML =
    '<span style="margin-right: 4px;">🤖</span>AI-Generated Context';
  wordHeader.appendChild(aiBadge);

  // AI content with better styling
  const aiContent = document.createElement("div");
  aiContent.style.cssText =
    "font-size: 15px; line-height: 1.8; color: #e5e7eb; padding: 12px; background: rgba(74, 222, 128, 0.05); border-radius: 8px; border-left: 3px solid rgba(74, 222, 128, 0.3);";
  aiContent.textContent = aiMeaning;

  container.appendChild(wordHeader);
  container.appendChild(aiContent);

  content.appendChild(container);
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
