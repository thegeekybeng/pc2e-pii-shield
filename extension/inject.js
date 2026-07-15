(function() {
  // Injected script - runs in page context to hook window.fetch and window.XMLHttpRequest
  console.log("🛡️ PII Shield: Interceptor active in page context.");

  let activeRoster = [];

  // Listen for roster updates from the content script (via window.postMessage)
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === "PII_SHIELD_ROSTER_UPDATE") {
      activeRoster = event.data.roster || [];
      console.log("🛡️ PII Shield: Injected context updated with roster size:", activeRoster.length);
    }
  });

  // Common English names list for local client-side matching
  const COMMON_NAMES = new Set([
    'tommy', 'sarah', 'alex', 'john', 'emma', 'liam', 'olivia', 'noah', 'ava', 
    'sophia', 'jackson', 'mia', 'lucas', 'isabella', 'ethan', 'chloe', 'mason', 
    'lily', 'logan', 'zoey', 'james', 'grace', 'jacob', 'emily', 'michael', 'abby',
    'ben', 'daniel', 'david', 'william', 'lucy', 'jack', 'henry', 'charlotte', 
    'mary', 'james', 'robert', 'patricia', 'jennifer', 'linda', 'elizabeth', 
    'barbara', 'susan', 'jessica', 'karen', 'nancy', 'lisa', 'betty', 'sandra'
  ]);

  // Core PII Shield Algorithms
  function predictPII(text, roster = []) {
    const matches = [];
    const seenRoster = new Set();
    const normalizedRoster = [];
    
    roster.forEach(name => {
      if (name) {
        const lower = name.trim().toLowerCase();
        if (lower.length > 1 && !seenRoster.has(lower)) {
          seenRoster.add(lower);
          normalizedRoster.push({ original: name.trim(), lower: lower });
        }
      }
    });

    // 1. Roster matching
    normalizedRoster.forEach(({ original, lower }) => {
      const escaped = lower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          term: match[0],
          index: match.index,
          length: match[0].length,
          type: 'ROSTER_NAME'
        });
      }
    });

    // 2. Student ID Regex
    const studentIdRegex = /\b(STU-\d{5}|[sS]\d{7}[a-zA-Z])\b/g;
    let idMatch;
    while ((idMatch = studentIdRegex.exec(text)) !== null) {
      matches.push({ term: idMatch[0], index: idMatch.index, length: idMatch[0].length, type: 'STUDENT_ID' });
    }

    // 3. Email Regex
    const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
    let emailMatch;
    while ((emailMatch = emailRegex.exec(text)) !== null) {
      matches.push({ term: emailMatch[0], index: emailMatch.index, length: emailMatch[0].length, type: 'EMAIL' });
    }

    // 4. Phone Regex
    const phoneRegex = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    let phoneMatch;
    while ((phoneMatch = phoneRegex.exec(text)) !== null) {
      matches.push({ term: phoneMatch[0], index: phoneMatch.index, length: phoneMatch[0].length, type: 'PHONE' });
    }

    // 5. Name Heuristics
    const words = text.match(/\b[A-Z][a-z]+\b/g) || [];
    const uniqueWords = [...new Set(words)];
    uniqueWords.forEach(word => {
      const wordLower = word.toLowerCase();
      if (COMMON_NAMES.has(wordLower)) {
        const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'g');
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({ term: match[0], index: match.index, length: match[0].length, type: 'NLP_NAME' });
        }
      }
    });

    // Overlap resolution
    const sortedMatches = [...matches].sort((a, b) => b.length - a.length || a.index - b.index);
    const finalMatches = [];
    sortedMatches.forEach(match => {
      const hasOverlap = finalMatches.some(accepted => 
        match.index < accepted.index + accepted.length && accepted.index < match.index + match.length
      );
      if (!hasOverlap) {
        finalMatches.push(match);
      }
    });

    return finalMatches.sort((a, b) => a.index - b.index);
  }

  function pseudonymize(text, approvedMatches) {
    const sorted = [...approvedMatches].sort((a, b) => b.index - a.index);
    const termToTokenMap = {};
    const tokenToTermMap = {};
    let studentCounter = 0;
    let idCounter = 0;
    let emailCounter = 0;
    let phoneCounter = 0;

    approvedMatches.forEach(m => {
      const term = m.term;
      const termKey = term.toLowerCase();
      
      if (!termToTokenMap[termKey]) {
        if (m.type === 'ROSTER_NAME' || m.type === 'NLP_NAME') {
          const letter = String.fromCharCode(65 + (studentCounter % 26));
          const token = `__STUDENT_${letter}__`;
          termToTokenMap[termKey] = token;
          tokenToTermMap[token] = term;
          studentCounter++;
        } else if (m.type === 'STUDENT_ID') {
          const token = `__STUDENT_ID_${++idCounter}__`;
          termToTokenMap[termKey] = token;
          tokenToTermMap[token] = term;
        } else if (m.type === 'EMAIL') {
          const token = `__EMAIL_${++emailCounter}__`;
          termToTokenMap[termKey] = token;
          tokenToTermMap[token] = m.term;
        } else if (m.type === 'PHONE') {
          const token = `__PHONE_${++phoneCounter}__`;
          termToTokenMap[termKey] = token;
          tokenToTermMap[token] = m.term;
        }
      }
    });

    let sanitizedText = text;
    sorted.forEach(m => {
      const token = termToTokenMap[m.term.toLowerCase()];
      if (token) {
        sanitizedText = sanitizedText.substring(0, m.index) + token + sanitizedText.substring(m.index + m.length);
      }
    });

    return { sanitizedText, tokenMap: tokenToTermMap };
  }

  function depseudonymize(responseText, tokenMap) {
    let output = responseText;
    const tokens = Object.keys(tokenMap).sort((a, b) => b.length - a.length);
    tokens.forEach(token => {
      const original = tokenMap[token];
      const escapedToken = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedToken, 'g');
      output = output.replace(regex, original);
    });
    return output;
  }

  // Intercept window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0];
    const options = args[1];

    // Check if the request is destined for an LLM API (e.g. OpenAI, Azure OpenAI, custom backend completion)
    const isLuminaOrAiApi = typeof url === 'string' && (
      url.includes('openai.com') || 
      url.includes('/chat/completions') || 
      url.includes('lumina.ai') ||
      url.includes('/api/ai')
    );

    if (isLuminaOrAiApi && options && options.body) {
      try {
        let bodyObj = JSON.parse(options.body);
        let intercepted = false;
        let tokenMappings = {};

        // Recurse through request payload to mask strings containing PII
        const scanAndMask = (obj) => {
          if (typeof obj === 'string') {
            const matches = predictPII(obj, activeRoster);
            if (matches.length > 0) {
              const { sanitizedText, tokenMap } = pseudonymize(obj, matches);
              tokenMappings = { ...tokenMappings, ...tokenMap };
              intercepted = true;
              return sanitizedText;
            }
          } else if (Array.isArray(obj)) {
            return obj.map(scanAndMask);
          } else if (obj !== null && typeof obj === 'object') {
            for (let key in obj) {
              obj[key] = scanAndMask(obj[key]);
            }
          }
          return obj;
        };

        bodyObj = scanAndMask(bodyObj);

        if (intercepted) {
          console.log("🛡️ PII Shield: Intercepted prompt payload. Masks applied:", Object.keys(tokenMappings));
          options.body = JSON.stringify(bodyObj);

          // Execute fetch with sanitized body and hook the return value to de-pseudonymize
          const response = await originalFetch.apply(this, args);
          
          // Intercept and de-pseudonymize response text stream
          const responseClone = response.clone();
          const rawText = await responseClone.text();
          const cleanText = depseudonymize(rawText, tokenMappings);
          
          console.log("🛡️ PII Shield: De-pseudonymized LLM response payload returned.");

          // Return a mocked Response object with restored names
          return new Response(cleanText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (err) {
        console.error("🛡️ PII Shield: Failed to process interceptor logic:", err);
      }
    }

    return originalFetch.apply(this, args);
  };
})();
