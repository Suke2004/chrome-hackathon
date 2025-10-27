// SuperBook Options Page
// Manages Gemini API key and AI mode settings

const geminiApiKeyInput = document.getElementById("geminiApiKey");
const geminiModelSelect = document.getElementById("geminiModel");
const contextSizeSelect = document.getElementById("contextSize");
const tooltipThemeSelect = document.getElementById("tooltipTheme");
const tooltipSizeSelect = document.getElementById("tooltipSize");
const fontSizeSelect = document.getElementById("fontSize");
const saveBtn = document.getElementById("saveBtn");
const testBtn = document.getElementById("testBtn");
const aiModeToggle = document.getElementById("aiModeToggle");
const statusMessage = document.getElementById("statusMessage");

// Load saved settings
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
    if (result.geminiApiKey) {
      geminiApiKeyInput.value = result.geminiApiKey;
    }
    if (result.geminiModel) {
      geminiModelSelect.value = result.geminiModel;
    }
    if (result.contextSize) {
      contextSizeSelect.value = result.contextSize;
    }
    if (result.tooltipTheme) {
      tooltipThemeSelect.value = result.tooltipTheme;
    }
    if (result.tooltipSize) {
      tooltipSizeSelect.value = result.tooltipSize;
    }
    if (result.fontSize) {
      fontSizeSelect.value = result.fontSize;
    }
    aiModeToggle.checked = result.aiMode !== false; // Default to true
  }
);

// Save settings
saveBtn.addEventListener("click", () => {
  const apiKey = geminiApiKeyInput.value.trim();
  const model = geminiModelSelect.value;
  const contextSize = contextSizeSelect.value;
  const tooltipTheme = tooltipThemeSelect.value;
  const tooltipSize = tooltipSizeSelect.value;
  const fontSize = fontSizeSelect.value;

  if (!apiKey) {
    showMessage("Please enter an API key", "error");
    return;
  }

  chrome.storage.local.set(
    {
      geminiApiKey: apiKey,
      geminiModel: model,
      contextSize: contextSize,
      tooltipTheme: tooltipTheme,
      tooltipSize: tooltipSize,
      fontSize: fontSize,
    },
    () => {
      showMessage("Settings saved successfully!", "success");

      // Notify content scripts about settings change
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, { action: "settingsUpdated" })
            .catch(() => {});
        });
      });
    }
  );
});

// Test API key
testBtn.addEventListener("click", async () => {
  const apiKey = geminiApiKeyInput.value.trim();

  if (!apiKey) {
    showMessage("Please enter an API key first", "error");
    return;
  }

  showMessage("Testing API key...", "success");

  const model = geminiModelSelect.value;

  try {
    // Use v1 API for Gemini 2.5 models
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Say 'API test successful' if you can read this.",
              },
            ],
          },
        ],
      }),
    });

    if (response.ok) {
      showMessage("✅ API key is valid!", "success");
    } else {
      const error = await response.json();
      showMessage(
        `❌ API test failed: ${error.error?.message || "Unknown error"}`,
        "error"
      );
    }
  } catch (error) {
    showMessage(`❌ Connection error: ${error.message}`, "error");
  }
});

// Toggle AI mode
aiModeToggle.addEventListener("change", () => {
  chrome.storage.local.set({ aiMode: aiModeToggle.checked }, () => {
    const status = aiModeToggle.checked ? "enabled" : "disabled";
    showMessage(`AI mode ${status}`, "success");

    // Notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, { action: "settingsUpdated" })
          .catch(() => {});
      });
    });
  });
});

function showMessage(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type} show`;

  setTimeout(() => {
    statusMessage.classList.remove("show");
  }, 4000);
}
