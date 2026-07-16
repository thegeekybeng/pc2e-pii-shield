# PII Shield: Domain-Agnostic Edge-Assisted Privacy Layer for Cloud GenAI

![stack](https://img.shields.io/badge/stack-ES%20Modules%20%7C%20HTML5%20%7C%20CSS3-1C3D5A?style=flat-square) ![deployment](https://img.shields.io/badge/deployment-Chrome%20Extension%20%7C%20NPM%20Package-2E5D8C?style=flat-square) ![security](https://img.shields.io/badge/security-OWASP%20LLM02%20%7C%20Bi--directional%20Tokenisation-059669?style=flat-square) ![governance](https://img.shields.io/badge/governance-PC2E%20%7C%20PDPA%20%7C%20GDPR-D97706?style=flat-square)

> **Vision:** To safeguard user privacy by establishing a client-side or edge-based interceptor layer that prevents Personally Identifiable Information (PII) from egressing to public cloud LLMs. Combining robust regex matchers and local NLP heuristics with bi-directional pseudonymisation to mask sensitive data while preserving GenAI utility.

**GitHub Topics:** `pii-masking` · `privacy-layer` · `pc2e-governance` · `client-side-interceptor` · `chrome-extension` · `npm-package` · `llm-security` · `data-protection` · `domain-agnostic`

---

## The Problem Space

In modern GenAI-enabled environments, organizations face a critical trilemma when adopting cloud LLMs:

1. **PII Egress Risks:** Sending raw customer, student, patient, or employee data (names, IDs, emails, phone numbers) directly to public LLMs violates privacy policies and data protection regulations (e.g., GDPR, PDPA, HIPAA).
2. **Lack of Trust Boundaries:** Once sensitive details leave the local environment, they are archived on third-party servers, creating compliance vulnerabilities and risk of data exposure.
3. **Integration Friction:** Implementing server-side security proxies requires significant dev cycles, complex routing, and network changes, slowing down AI integration.

---

## The Solution: A Client-Side PII Shield Interceptor

PII Shield functions as a domain-agnostic client-side privacy layer that sits directly between the user workspace and cloud LLM APIs. By operating entirely in-browser or inside client runtimes, it intercepts prompt payloads before egress, masks PII with consistent anonymous tokens, and restores the original values locally in the client response.

* **Direct Integration:** Sits directly within app wrappers as a software dependency, processing text before execution.
* **Zero-Code Browser Extension:** Dynamically injects into frontend execution contexts, hooking the page's native `window.fetch` to mask prompts destined for cloud LLMs transparently without codebase modification.

---

## Key Capabilities

* **Multi-Domain Adaptability:** Instantly switches between Education, Customer Support, Human Resources, and Finance presets to mask domain-specific names and registries.
* **Local Pattern & NLP Heuristics:** Detects roster-based names, emails, phone numbers, custom identifiers (student, employee, order, account), and common name sets.
* **Bi-Directional Pseudonymisation:** Ephemerally replaces PII with consistent tokens (e.g. `__PERSON_A__`, `__ID_1__`) and restores them locally in-browser, preventing LLM context dilution.
* **Interactive Egress Intercept Modal:** Prompts users when PII is detected, allowing them to sanitize, redact, or whitelist specific entities.
* **Zero-Data Leakage:** Runs 100% locally in client-side runtime; no text or roster list is ever transmitted to a tracking backend.

---

## Layered Architecture (PC2E-Aligned)

The system works as a client-side middleware/interceptor layer that wraps LLM calls, executing the following 4-stage pipeline:

```text
[Input Workspace] 
       │
       ▼ (Submit)
 ┌───────────┐
 │  PREDICT  │ ──► Checks roster cache and matches PII patterns (Regex + NLP fallback).
 └─────┬─────┘
       │ (PII detected, intercept overlay alerts user & shows explanations)
       ▼
 ┌───────────────┐
 │ PSEUDONYMIZE  │ ──► Replaces detected PII with ephemeral tokens (e.g. "__PERSON_A__").
 └───────┬───────┘
         │
         ▼ (Sanitized prompt only sent to cloud)
  [Cloud LLM API]
         │
         ▼ (Response returned with tokens: "Coordinate review with __PERSON_A__...")
 ┌───────────────┐
 │ DE-PSEUDONYM  │ ──► Restores original names in client browser.
 └───────┬───────┘
         │
         ▼
  [Client Output]
```

### Core Pipeline Stages

1. **Predict**: The client checks the active roster cache and matches patterns (Regex + fallback NLP name sets) in-browser. If PII is found, it triggers an interactive intercept overlay showing exactly what was flagged and why.
2. **Intercept & Review**: Interactive modal displays detected PII and allows granular sanitization action selection (pseudonymize, redact, whitelist).
3. **Pseudonymize**: Generates an ephemeral mapping to replace approved PII matches with consistent tokens (e.g. `__PERSON_A__` and `__ID_1__`).
4. **De-pseudonymize**: Restores original names from the ephemeral token map within the response returned to the client browser.

---

## Repository Structure

```text
pc2e-pii-shield/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md          ← Bug reporting issue template
│   │   └── feature_request.md     ← Feature request suggestion template
│   ├── workflows/
│   │   ├── test.yml               ← Node.js CI test suite action matrix
│   │   └── publish.yml            ← npm package publication action (releases)
│   └── pull_request_template.md    ← PR criteria Checklist
├── extension/                     ← Chrome browser extension context
│   ├── manifest.json              ← Manifest V3 setup (zero-code interceptor)
│   ├── contentScript.js           ← Isolated script managing local storage
│   ├── inject.js                  ← Page script overriding fetch calls
│   ├── popup.html                 ← Active roster upload interface
│   └── popup.js                   ← Active roster sync script
├── README.md                      ← Documentation and specifications
├── LICENSE                        ← Standard MIT License terms
├── SECURITY.md                    ← Security disclosure guidelines
├── CODE_OF_CONDUCT.md             ← Contributor behavior guidelines
├── CONTRIBUTING.md                ← Development & review guidelines
├── package.json                   ← Project configuration & files filter
├── package-lock.json              ← Lockfile dependency tree
├── index.html                     ← Glassmorphic preset sandbox dashboard
├── piiFilter.js                   ← Core ES module masking library
├── entityRoster.json              ← Default generic roster sample database
└── verify_pii.js                  ← Local test assertions suite
```

---

## Tech Stack

| Component | Technology | Description |
| --- | --- | --- |
| **Sandbox UI** | HTML5 / Vanilla CSS | Interactive glassmorphic visual playground |
| **Logic Layer** | Javascript (ES Modules) | Local regex engines & NLP name tokenizers |
| **Extension Framework** | WebExtensions Manifest V3 | Standard secure browser extension structure |
| **Test Suite** | Node.js | Automated assertions checking boundary cases |

---

## 🚀 Running Locally

To run the interactive UI dashboard:

1. Serve the files locally. Because it uses ES Modules (`import/export`), you must run an HTTP server rather than opening `index.html` directly in the browser:

   ```bash
   npx serve .
   # or
   python3 -m http.server
   ```

2. Open the printed localhost URL in your browser.
3. Choose a domain preset (Education, Customer Support, Human Resources, or Finance) to load relevant sample PII and rosters.
4. Click **"Run Local Predict"** or **"Submit to Cloud AI"** to see the PII Shield interceptor modal in action!

---

## 📦 Packaging & Integration Options

To deploy this interceptor directly to your LLM portals, choose one of the packaging formats below:

### 1. Browser Extension (Zero-Code Deployment)

Perfect if you run third-party LLM portals and cannot change their underlying code directly.

* **How it Works:** The extension injects `inject.js` directly into the page context. It intercepts `window.fetch` requests destined for AI endpoints, executes `pseudonymize` in-browser, forwards the sanitized prompt, and `depseudonymizes` the response before the page displays it.
* **To Install & Test:**
    1. Open Google Chrome and go to `chrome://extensions/`.
    2. Enable **Developer mode** (top-right toggle).
    3. Click **"Load unpacked"** (top-left button).
    4. Select the `extension/` folder in this repository.
    5. Click the extension icon in your toolbar, upload `entityRoster.json`, and run your LLM page. All PII is masked transparently!

### 2. npm Package (Direct Codebase Integration)

If you own the application codebase and want to integrate this directly as a secure software dependency:

* **To Install:**

  ```bash
  npm install @thegeekybeng/pii-shield
  ```

* **To Integrate:**

  ```javascript
  import { predictPII, pseudonymize, depseudonymize } from '@thegeekybeng/pii-shield';

  // 1. Scan prompt for PII
  const matches = predictPII(promptText, activeRosterArray);
  
  // 2. Mask names before sending to Cloud LLM
  const { sanitizedText, tokenMap } = pseudonymize(promptText, matches);
  
  // 3. Send sanitized prompt to LLM
  const response = await callCloudLLM(sanitizedText);
  
  // 4. Restore names locally in the UI
  const finalSafeText = depseudonymize(response.choices[0].message.content, tokenMap);
  ```

---

## Security Compliance (OWASP Top 10 for LLMs 2025)

PII Shield is engineered to satisfy security frameworks for LLM Applications 2025:

| # | Risk | Status | Control |
| --- | --- | --- | --- |
| **LLM02** | Sensitive Information Disclosure | ✅ Mitigated | Local edge/client-side PII masking on names, emails, phone numbers, and identifier patterns before egress; no PII ever leaves the client runtime. |
| **LLM06** | Excessive Agency | ✅ Mitigated | Bi-directional token mapping limits the context sent to the model, reducing the possibility of the LLM executing unintended personal tasks. |
| **LLM09** | Misinformation | ✅ Mitigated | Transparent intercept alert modal ensures human-in-the-loop validation of all masked/whitelisted entities prior to ingestion. |

---

## 🧪 Automated Testing & CI

Local tests verify regex execution speed, boundary case detection, and bi-directional token mapping accuracy.

* **To Run Tests Locally:**

  ```bash
  npm test
  # or node verify_pii.js
  ```

* **Continuous Integration (CI):**
  GitHub Actions automatically triggers a node matrix build (`.github/workflows/test.yml`) executing the test suite against **Node.js versions 18.x, 20.x, and 22.x** on every pull request and push to the `main` branch. This guarantees that contributions preserve all PII masking assertions before code is merged.

---

## Governance & Compliance

PII Shield is built in compliance with:

* **Singapore PDPA** — Data Minimisation & Protection Principles.
* **GDPR (Article 25/32)** — Privacy by Design and Pseudonymisation.
* **PC2E AI Governance Framework** — Portable Continuous Context Engine guidelines for secure local execution boundaries.

---

## Disclaimer & Research Purpose

> [!IMPORTANT]
> **This project is an independent research and development proof-of-concept demonstrating edge-assisted PII masking.**
> It is aimed at establishing modular, client-side middleware interfaces that guarantee privacy without compromising LLM utility.
