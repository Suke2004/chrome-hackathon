# 🧪 SuperBook Testing Guide

## 📋 How to Test in Chrome

### Step 1: Build the Extension

1. **Open Terminal/Command Prompt** in the project directory:

```bash
cd d:\Prog\hackathons\chrome_hackathon\SuperBook
```

2. **Install dependencies** (if not already done):

```bash
pnpm install
```

3. **Build the extension**:

```bash
pnpm run build
```

This creates a `dist` folder with the compiled extension.

---

### Step 2: Load Extension in Chrome

1. **Open Chrome Extensions Page**:

   - Go to `chrome://extensions/`
   - Or: Menu (☰) → More Tools → Extensions

2. **Enable Developer Mode**:

   - Toggle "Developer mode" ON (top right corner)

3. **Load the Extension**:

   - Click **"Load unpacked"**
   - Navigate to: `d:\Prog\hackathons\chrome_hackathon\SuperBook\public`
   - Click **Select Folder**

4. **Verify Installation**:
   - You should see SuperBook in your extensions list
   - Icon should appear in the toolbar
   - Status should show "SuperBook (Enabled)"

---

### Step 3: Configure Settings

1. **Open Settings**:

   - Click the SuperBook icon in Chrome toolbar
   - Click the **⚙️ settings** button
   - Settings page opens in new tab

2. **Add Your API Key**:

   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Paste it in "Gemini API Key" field
   - Click **"Save Settings"**
   - Click **"Test API Key"** to verify it works

3. **Configure Options** (optional):

   - **Model**: Choose `gemini-2.5-flash-lite` (recommended)
   - **Context Size**: Medium (recommended)
   - **Theme**: Dark (default)
   - **Tooltip Size**: Medium
   - **Font Size**: Medium

4. **Enable AI Mode**:
   - Toggle **"Enable AI Contextual Meanings"** ON

---

### Step 4: Test the Extension

#### Test 1: Basic Word Lookup

1. **Open any webpage** (e.g., Wikipedia article)
2. **Select a single word** (not multiple words)
3. **Hover button appears** above the word (with 📚 icon)
4. **Click the hover button**
5. **You should see**:
   ```
   🤖 (loading animation)
   WORD
   AI is analyzing the context...
   ```
6. **Then**:

   ```
   WORD
   🤖 AI-Generated Context

   [Contextual explanation]
   ```

#### Test 2: Context-Aware Analysis

1. **Find a paragraph** with a meaningful word
2. **Select the word** (ensuring it has context)
3. **Click the hover button**
4. **Verify**: AI provides contextual explanation based on surrounding text

#### Test 3: Different Context Sizes

1. **Open Settings**
2. **Try different context sizes**:
   - Small: Select a word in a short sentence
   - Medium: Select a word in a paragraph
   - Large: Select a word with multiple paragraphs
3. **Observe**: AI adjusts explanation based on context

#### Test 4: Theme Customization

1. **Open Settings**
2. **Change Theme**: Dark → Light
3. **Select a word** and verify light theme appears

#### Test 5: Error Handling

1. **Disable AI Mode** in settings
2. **Select a word**
3. **Should show**: "AI Mode Required" message
4. **Re-enable** and test again

---

## 🐛 Troubleshooting

### Issue: Extension not loading

**Solution**:

- Make sure you selected the `public` folder (not `dist`)
- Check for errors in `chrome://extensions/`
- Try reloading the extension

### Issue: AI not working

**Solution**:

- Verify API key is correct in settings
- Test the API key with "Test API Key" button
- Check if AI mode is enabled
- Ensure you have internet connection

### Issue: No hover button appears

**Solution**:

- Select only ONE word (not multiple)
- Make sure word is NOT in an input field
- Try on a different webpage
- Check if extension is enabled in chrome://extensions/

### Issue: "No context available"

**Solution**:

- Select text with surrounding context
- Try selecting a word in the middle of a paragraph
- Increase context window size in settings

### Issue: Loading forever

**Solution**:

- Check internet connection
- Verify API key is valid
- Try a different word
- Check browser console (F12) for errors

---

## 🧪 Testing Checklist

### Functionality

- [ ] Extension loads without errors
- [ ] Settings page opens
- [ ] API key can be saved and tested
- [ ] AI mode toggle works
- [ ] Hover button appears on word selection
- [ ] Tooltip shows loading state
- [ ] Tooltip displays AI-generated content
- [ ] Customization options work (theme, size, font)
- [ ] Context size setting affects AI analysis
- [ ] Error handling works gracefully

### UI/UX

- [ ] Loading animation is smooth
- [ ] Tooltip design is modern and clean
- [ ] AI badge is visible and clear
- [ ] Text is readable
- [ ] Colors are appropriate
- [ ] Responsive on different screen sizes
- [ ] No "word not found" messages
- [ ] Always provides helpful responses

### Edge Cases

- [ ] Works without context → AI still responds
- [ ] Works with technical terms
- [ ] Works with uncommon words
- [ ] Works on different websites
- [ ] Handles network errors gracefully
- [ ] Handles API timeouts gracefully

---

## 📊 Quick Test Scenarios

### Scenario 1: Wikipedia

1. Go to [Wikipedia](https://en.wikipedia.org)
2. Open any article
3. Select a technical term
4. Verify AI explains it in context

### Scenario 2: News Article

1. Go to any news website
2. Find an article
3. Select a word
4. Check if AI provides contextual meaning

### Scenario 3: Blog Post

1. Find a blog or Medium article
2. Select words throughout the article
3. Observe consistent AI responses
4. Test different context lengths

### Scenario 4: Technical Documentation

1. Open technical docs (GitHub, etc.)
2. Select programming terms
3. Verify AI explains them properly
4. Check if context is captured well

---

## 🎯 What to Look For

### Good Signs ✅

- Smooth animations
- Fast loading (under 3 seconds)
- Relevant contextual explanations
- No errors in console
- Clean UI presentation
- Helpful messages when things go wrong

### Bad Signs ❌

- Stuck on loading
- Generic or vague explanations
- Console errors
- "Word not found" messages
- Poor performance
- UI glitches

---

## 💡 Tips for Best Results

1. **Select text with context**: Words in paragraphs work best
2. **Use medium context size** for balanced results
3. **Test different words**: Try common, technical, and uncommon words
4. **Check multiple sites**: Test on different website layouts
5. **Adjust settings**: Try different themes and sizes
6. **Monitor console**: Press F12 to see any errors

---

## 🚀 Demo Preparation

For your hackathon demo:

1. **Test all features** before presenting
2. **Prepare example words** to demonstrate
3. **Show customization** options
4. **Demonstrate AI vs Dictionary** benefits
5. **Highlight context awareness**
6. **Show error handling**

### Demo Flow

1. Open a sample page (e.g., Wikipedia)
2. Select a word with context
3. Show loading → AI response
4. Open settings and show customization
5. Change theme/size and demonstrate
6. Show AI provides context even without context
7. Highlight "never says 'not found'"

---

## ✅ Ready to Test!

Your SuperBook extension is ready to test. Follow the steps above and you'll have a fully functional AI-powered dictionary extension!

**Good luck with your hackathon!** 🎉
