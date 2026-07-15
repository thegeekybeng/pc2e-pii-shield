import { predictPII, pseudonymize, depseudonymize } from './piiFilter.js';

// Setup mock roster
const mockRoster = [
  "Tommy Henderson",
  "Sarah Jenkins",
  "Alex Rivera",
  "Sarah"
];

// Define test cases
const testCases = [
  {
    name: "Roster Name Detection",
    input: "Create a reading log for Tommy Henderson.",
    verify: (predictions) => {
      const match = predictions.find(p => p.term === "Tommy Henderson");
      if (!match) throw new Error("Failed to detect exact roster name Tommy Henderson");
      if (match.type !== "ROSTER_NAME") throw new Error("Incorrect prediction type for roster name");
    }
  },
  {
    name: "Regular Expression Email Detection",
    input: "Email parent at test@school.edu to coordinate class.",
    verify: (predictions) => {
      const match = predictions.find(p => p.term === "test@school.edu");
      if (!match) throw new Error("Failed to detect email test@school.edu");
      if (match.type !== "EMAIL") throw new Error("Incorrect prediction type for email");
    }
  },
  {
    name: "Regular Expression Phone Detection",
    input: "Reach out to parents via phone 555-123-4567.",
    verify: (predictions) => {
      const match = predictions.find(p => p.term === "555-123-4567");
      if (!match) throw new Error("Failed to detect phone number");
      if (match.type !== "PHONE") throw new Error("Incorrect prediction type for phone");
    }
  },
  {
    name: "Student ID Detection",
    input: "Student STU-88291 will be placed in group A.",
    verify: (predictions) => {
      const match = predictions.find(p => p.term === "STU-88291");
      if (!match) throw new Error("Failed to detect Student ID");
      if (match.type !== "STUDENT_ID") throw new Error("Incorrect prediction type for student ID");
    }
  },
  {
    name: "NLP Heuristics Fallback (Common Names)",
    input: "Please check on Chloe to see if she is finished.",
    verify: (predictions) => {
      const match = predictions.find(p => p.term === "Chloe");
      if (!match) throw new Error("Failed to detect common first name fallback");
      if (match.type !== "NLP_NAME") throw new Error("Incorrect prediction type for common name fallback");
    }
  },
  {
    name: "Bi-directional Pseudonymization & De-pseudonymization Loop",
    input: "Group A consists of Tommy Henderson. Sarah Jenkins is Group B.",
    verify: (predictions) => {
      // 1. Run pseudonymization
      const { sanitizedText, tokenMap } = pseudonymize("Group A consists of Tommy Henderson. Sarah Jenkins is Group B.", predictions);
      
      if (!sanitizedText.includes("__STUDENT_A__") || !sanitizedText.includes("__STUDENT_B__")) {
        throw new Error("Failed to replace PII with appropriate student tokens. Got: " + sanitizedText);
      }
      if (sanitizedText.includes("Tommy Henderson") || sanitizedText.includes("Sarah Jenkins")) {
        throw new Error("Sanitized text still contains raw student names");
      }

      // 2. Simulate LLM output utilizing the tokens
      const mockLlmResponse = "Understood. Group A (__STUDENT_A__) has 5 minutes. Group B (__STUDENT_B__) has 10 minutes.";
      
      // 3. De-pseudonymize on client
      const restored = depseudonymize(mockLlmResponse, tokenMap);
      
      if (!restored.includes("Tommy Henderson") || !restored.includes("Sarah Jenkins")) {
        throw new Error("Failed to restore original student names from token map. Got: " + restored);
      }
      if (restored.includes("__STUDENT_A__") || restored.includes("__STUDENT_B__")) {
        throw new Error("Restored text still contains unmapped token placeholders");
      }
    }
  },
  {
    name: "Overlapping Roster Name Conflict Resolution",
    input: "Please tell Sarah Jenkins to submit her homework.",
    verify: (predictions) => {
      if (predictions.length !== 1) {
        throw new Error(`Expected exactly 1 prediction, got ${predictions.length}`);
      }
      const match = predictions[0];
      if (match.term !== "Sarah Jenkins") {
        throw new Error(`Expected match term "Sarah Jenkins", got "${match.term}"`);
      }
      // 1. Run pseudonymization
      const { sanitizedText, tokenMap } = pseudonymize("Please tell Sarah Jenkins to submit her homework.", predictions);
      if (sanitizedText !== "Please tell __STUDENT_A__ to submit her homework.") {
        throw new Error(`Expected sanitized text to be cleaned correctly, got: "${sanitizedText}"`);
      }
      // 2. Restore
      const restored = depseudonymize(sanitizedText, tokenMap);
      if (restored !== "Please tell Sarah Jenkins to submit her homework.") {
        throw new Error(`Expected restored text to match original, got: "${restored}"`);
      }
    }
  }
];

// Run Tests
console.log("=== RUNNING PII SHIELD TESTS ===");
let passed = 0;
let failed = 0;

testCases.forEach((tc, idx) => {
  try {
    const predictions = predictPII(tc.input, mockRoster);
    tc.verify(predictions);
    console.log(`[PASS] Test ${idx + 1}: ${tc.name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${idx + 1}: ${tc.name}`);
    console.error(`       Error: ${err.message}`);
    failed++;
  }
});

console.log("\n=== SUMMARY ===");
console.log(`PASSED: ${passed}/${testCases.length}`);
console.log(`FAILED: ${failed}/${testCases.length}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed successfully.");
  process.exit(0);
}
