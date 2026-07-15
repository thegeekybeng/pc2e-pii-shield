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

## 📋 Roster Configuration: Mock vs Real Roster

The PII Shield relies on a roster list to match student names. You can test and deploy this using either the preconfigured mock roster or your own real roster:

### 1. Using the Default Mock Roster
- **Automatic Load:** When you run the dashboard, it automatically loads a mock student list from [classRoster.json](file:~/school-course-planner-pii/classRoster.json) (falling back to a hardcoded array of names like Tommy, Sarah, and Alex if the file is missing).
- **Edit Default Mock Data:** You can customize this default mock list by editing [classRoster.json](file:~/school-course-planner-pii/classRoster.json) directly.

### 2. Uploading a Real Roster
To test with your actual class roster:
1. Prepare a file in one of the following formats:
   - **TXT:** A plain text file with one student name per line.
   - **CSV:** A roster spreadsheet (header rows like `Name` or `Student Name` are automatically detected and skipped; comma-quoted rows and `"LastName, FirstName"` order are automatically converted to standard `"FirstName LastName"`).
   - **JSON:** A JSON array of name strings (e.g. `["Student A", "Student B"]`).
2. In the **Active Student Class Roster** card on the dashboard, click the **"Upload Roster"** button.
3. Select your file.
4. **Choose your Import Action when prompted:** 
   - Click **OK (REPLACE)** to completely remove the mock roster and use only your uploaded names.
   - Click **Cancel (APPEND)** to keep the mock roster and add your uploaded names to it.

---

## 🧪 Automated Testing

To verify the PII regex, roster matchers, and bi-directional pseudonymization loops:

```bash
node verify_pii.js
```
All assertions should pass successfully.
