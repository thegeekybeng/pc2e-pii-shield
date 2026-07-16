/**
 * PII Shield - A PC2E-Aligned Domain-Agnostic Privacy Layer
 * 
 * Provides:
 * - Predict: Identifies potential PII (Roster names, email, phone, identifiers/IDs, name heuristics)
 * - Pseudonymize: Replaces detected PII with anonymous tokens (e.g. __PERSON_A__)
 * - De-pseudonymize: Restores original PII into the LLM output
 */

// Common English names list for lightweight local client-side NLP fallback
const COMMON_NAMES = new Set([
  'tommy', 'sarah', 'alex', 'john', 'emma', 'liam', 'olivia', 'noah', 'ava', 
  'sophia', 'jackson', 'mia', 'lucas', 'isabella', 'ethan', 'chloe', 'mason', 
  'lily', 'logan', 'zoey', 'james', 'grace', 'jacob', 'emily', 'michael', 'abby',
  'ben', 'daniel', 'david', 'william', 'lucy', 'jack', 'henry', 'charlotte', 
  'mary', 'james', 'robert', 'patricia', 'jennifer', 'linda', 'elizabeth', 
  'barbara', 'susan', 'jessica', 'karen', 'nancy', 'lisa', 'betty', 'sandra'
]);

/**
 * Predict potential PII in the given text
 * @param {string} text 
 * @param {Array<string>} roster list of names
 * @returns {Array<Object>} list of identified PII spans
 */
export function predictPII(text, roster = []) {
  const matches = [];
  
  // Normalize roster names for case-insensitive search and deduplicate
  const seenRoster = new Set();
  const normalizedRoster = [];
  roster.forEach(name => {
    if (name) {
      const lower = name.trim().toLowerCase();
      if (lower.length > 1 && !seenRoster.has(lower)) {
        seenRoster.add(lower);
        normalizedRoster.push({
          original: name.trim(),
          lower: lower
        });
      }
    }
  });

  // 1. Roster matching (highest confidence)
  normalizedRoster.forEach(({ original, lower }) => {
    // Escape regex characters
    const escaped = lower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        term: match[0],
        index: match.index,
        length: match[0].length,
        type: 'ROSTER_NAME',
        reason: `Matches name "${original}" from the active roster.`
      });
    }
  });

  // 2. Identifier/ID Regex
  // Matches typical registration/student/employee/account/order IDs (e.g. STU-12345, EMP-99281, ACC-48291, ORD-00291)
  // Also supports Singapore NRIC/FIN formats
  const idRegex = /\b((?:STU|EMP|ACC|ORD)-\d{5}|[sS]\d{7}[a-zA-Z])\b/gi;
  let idMatch;
  while ((idMatch = idRegex.exec(text)) !== null) {
    matches.push({
      term: idMatch[0],
      index: idMatch.index,
      length: idMatch[0].length,
      type: 'IDENTIFIER',
      reason: `Matches typical registration ID/Identifier format.`
    });
  }

  // 3. Email Regex
  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  let emailMatch;
  while ((emailMatch = emailRegex.exec(text)) !== null) {
    matches.push({
      term: emailMatch[0],
      index: emailMatch.index,
      length: emailMatch[0].length,
      type: 'EMAIL',
      reason: `Contains email address pattern.`
    });
  }

  // 4. Phone Number Regex (various international/local formats)
  const phoneRegex = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  let phoneMatch;
  while ((phoneMatch = phoneRegex.exec(text)) !== null) {
    matches.push({
      term: phoneMatch[0],
      index: phoneMatch.index,
      length: phoneMatch[0].length,
      type: 'PHONE',
      reason: `Contains telephone number format.`
    });
  }

  // 5. Client-side Name Heuristics (Fallback)
  // Match capitalized words that look like names and are not in roster, but appear in COMMON_NAMES
  const words = text.match(/\b[A-Z][a-z]+\b/g) || [];
  const uniqueWords = [...new Set(words)];
  uniqueWords.forEach(word => {
    const wordLower = word.toLowerCase();
    
    // Check if the capitalized word is a common name AND not already matched by roster
    if (COMMON_NAMES.has(wordLower)) {
      const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          term: match[0],
          index: match.index,
          length: match[0].length,
          type: 'NLP_NAME',
          reason: `Lightweight client NLP flagged "${match[0]}" as a common first name. Not in roster, but high-risk.`
        });
      }
    }
  });

  // Resolve overlapping matches by keeping the longest non-overlapping spans
  const sortedMatches = [...matches].sort((a, b) => {
    if (b.length !== a.length) {
      return b.length - a.length;
    }
    return a.index - b.index;
  });

  const finalMatches = [];
  sortedMatches.forEach(match => {
    const hasOverlap = finalMatches.some(accepted => 
      match.index < accepted.index + accepted.length && accepted.index < match.index + match.length
    );
    if (!hasOverlap) {
      finalMatches.push(match);
    }
  });

  // Sort matches by index ascending before returning
  return finalMatches.sort((a, b) => a.index - b.index);
}

/**
 * Replace predicted PII with consistent placeholders
 * @param {string} text 
 * @param {Array<Object>} approvedMatches matches to be pseudonymized
 * @returns {Object} { sanitizedText, tokenMap }
 */
export function pseudonymize(text, approvedMatches) {
  // Sort approvedMatches descending to replace from end of string to start (prevents indices shifting)
  const sorted = [...approvedMatches].sort((a, b) => b.index - a.index);
  
  // Create a map to track unique terms to same token (e.g. all "Tommy" -> "__PERSON_A__")
  const termToTokenMap = {};
  const tokenToTermMap = {};
  let personCounter = 0;
  let idCounter = 0;
  let emailCounter = 0;
  let phoneCounter = 0;

  // Map identical terms to the same tokens first
  approvedMatches.forEach(m => {
    const term = m.term;
    const termKey = term.toLowerCase();
    
    if (!termToTokenMap[termKey]) {
      if (m.type === 'ROSTER_NAME' || m.type === 'NLP_NAME') {
        const letter = String.fromCharCode(65 + (personCounter % 26)); // A, B, C...
        const prefix = personCounter >= 26 ? Math.floor(personCounter / 26) + 1 : '';
        const token = `__PERSON_${letter}${prefix}__`;
        termToTokenMap[termKey] = token;
        tokenToTermMap[token] = term;
        personCounter++;
      } else if (m.type === 'IDENTIFIER') {
        const token = `__ID_${++idCounter}__`;
        termToTokenMap[termKey] = token;
        tokenToTermMap[token] = term;
      } else if (m.type === 'EMAIL') {
        const token = `__EMAIL_${++emailCounter}__`;
        termToTokenMap[termKey] = token;
        tokenToTermMap[token] = term;
      } else if (m.type === 'PHONE') {
        const token = `__PHONE_${++phoneCounter}__`;
        termToTokenMap[termKey] = token;
        tokenToTermMap[token] = term;
      }
    }
  });

  // Re-build text from back to front
  let sanitizedText = text;
  sorted.forEach(m => {
    const token = termToTokenMap[m.term.toLowerCase()];
    if (token) {
      sanitizedText = sanitizedText.substring(0, m.index) + 
                     token + 
                     sanitizedText.substring(m.index + m.length);
    }
  });

  return {
    sanitizedText,
    tokenMap: tokenToTermMap
  };
}

/**
 * Restore original PII in the generated response from LLM
 * @param {string} responseText 
 * @param {Object} tokenMap mapping of token -> original value
 * @returns {string} desanitized text
 */
export function depseudonymize(responseText, tokenMap) {
  let output = responseText;
  
  // Sort keys (tokens) by length descending to prevent substring issues (e.g. PERSON_AA vs PERSON_A)
  const tokens = Object.keys(tokenMap).sort((a, b) => b.length - a.length);
  
  tokens.forEach(token => {
    const original = tokenMap[token];
    
    // Replace all occurrences of the token
    // We also support possessive case formatting if LLM generated it like token's
    // (e.g. __PERSON_A__'s -> Tommy's)
    const escapedToken = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedToken, 'g');
    output = output.replace(regex, original);
  });
  
  return output;
}
