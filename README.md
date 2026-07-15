# PII Shield — A PC2E-Aligned Privacy Layer

An edge-assisted Personally Identifiable Information (PII) blocking layer designed to protect student privacy in cloud-based AI tools. PC2E (Portable Continuous Context Engine) is my published governance framework, and this PII Shield is an applied implementation of its principles — a model-agnostic privacy layer that masks PII before egress to any cloud LLM.

This repository serves as a fully functional proof-of-concept demonstrating how school course planners can prevent teacher-entered student names, IDs, emails, and phone numbers from being transmitted to public/cloud LLM providers, while maintaining the utility of the AI.

---

## 🛠️ System Architecture (PC2E-Aligned)

The system works as a client-side middleware/interceptor layer that wraps LLM calls, executing the following pipeline:

```
[Teacher Input Workspace] 
         │
         ▼ (Submit)
   ┌───────────┐
   │  PREDICT  │ ──► Checks roster cache and matches PII patterns (Regex + NLP fallback).
   └─────┬─────┘
         │ (PII detected, intercept overlay alerts user & shows explanations)
         ▼
 ┌───────────────┐
 │ PSEUDONYMIZE  │ ──► Replaces detected PII with ephemeral tokens (e.g. "__STUDENT_A__").
 └───────┬───────┘
         │
         ▼ (Sanitized prompt only sent to cloud)
  [Cloud LLM API]
         │
         ▼ (Response returned with tokens: "Pair __STUDENT_A__ with tutor...")
 ┌───────────────┐
 │ DE-PSEUDONYM  │ ──► Restores original names in client browser.
 └───────┬───────┘
         │
         ▼
  [Teacher Output]
```

### The Core Pipeline Stages

1. **Predict**: The client checks the active roster cache and matches patterns (Regex + fallback NLP name sets) in-browser. If PII is found, it triggers an interactive intercept overlay showing exactly what was flagged and why.
2. **Pseudonymize**: Generates an ephemeral mapping to replace approved PII matches with consistent tokens (e.g. `__STUDENT_A__`).
3. **De-pseudonymize**: Restores original student names from the ephemeral token map within the response returned to the client browser.

---

## 📁 Repository Structure

- `index.html`: Gorgeous glassmorphic visual dashboard demonstrating input, prediction, intercept, sanitization, cloud mock, restoration, and dynamic roster file upload.
- `piiFilter.js`: Core ES module containing `predictPII`, `pseudonymize`, and `depseudonymize`.
- `classRoster.json`: Sample list of student names loaded dynamically into the browser cache.
- `verify_pii.js`: Automated Node.js verification test suite checking PII boundary cases.
- `extension/`: Chrome browser extension for zero-code injection on Lumina AI.
  - `manifest.json`: Manifest V3 setup.
  - `contentScript.js`: Content script that manages roster storage and injects the proxy hooks.
  - `inject.js`: Overrides the page's native `window.fetch` and handles masking transparently.
  - `popup.html` & `popup.js`: Dashboard interface for roster uploads.
  - `icon.png`: Icon assets.

---

## 🚀 Running Locally

To run the interactive UI dashboard:

1. Serve the files locally. Because it uses ES Modules (`import/export`), you must run a simple HTTP server rather than opening `index.html` directly in the browser. You can use any static server, for example:
   ```bash
   npx serve .
   # or
   python3 -m http.server
   ```
2. Open the printed localhost URL in your browser.
3. Click **"Load Sample with PII"** to populate the workspace.
4. Click **"Run Local Predict"** or **"Submit to Cloud AI"** to see the PII Shield interceptor modal in action!

---

## 📦 Packaging & Integration Options

To deploy this interceptor directly to **EtonHouse's Lumina AI** (or any lesson planner/LLM app), choose one of the packaging formats below:

### 1. Browser Extension (Zero-Code Deployment)
Perfect if you run Lumina AI as a third-party service and cannot change its underlying code directly.
*   **How it Works:** The extension injects `inject.js` directly into Lumina's frontend execution context. It intercepts `window.fetch` requests destined for AI endpoints, executes `pseudonymize` in-browser, forwards the sanitized prompt, and `depseudonymizes` the response before the page displays it.
*   **To Install & Test:**
    1. Open Google Chrome and go to `chrome://extensions/`.
    2. Enable **Developer mode** (top-right toggle).
    3. Click **"Load unpacked"** (top-left button).
    4. Select the `extension/` folder in this repository.
    5. Click the extension icon in your toolbar, upload `classRoster.json`, and run your lesson planner. All PII is masked transparently!

### 2. npm Package (Direct Codebase Integration)
If EtonHouse owns the Lumina AI codebase and wants to integrate this directly as a secure software dependency:
*   **To Install:**
    ```bash
    npm install @thegeekybeng/pii-shield
    ```
*   **To Integrate:**
    ```javascript
    import { predictPII, pseudonymize, depseudonymize } from '@thegeekybeng/pii-shield';

    // 1. Scan prompt for PII
    const matches = predictPII(promptText, classRosterArray);
    
    // 2. Mask names before sending to Azure OpenAI/Cloud LLM
    const { sanitizedText, tokenMap } = pseudonymize(promptText, matches);
    
    // 3. Send sanitized prompt to LLM
    const response = await callLuminaLLM(sanitizedText);
    
    // 4. Restore names locally in the UI
    const finalSafeText = depseudonymize(response.choices[0].message.content, tokenMap);
    ```

---

## 🧪 Automated Testing

To verify the PII regex, roster matchers, and bi-directional pseudonymization loops:

```bash
node verify_pii.js
```
All assertions should pass successfully.
