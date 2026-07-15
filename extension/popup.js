document.addEventListener('DOMContentLoaded', () => {
  const rosterFileInput = document.getElementById('roster-file');
  const rosterCountEl = document.getElementById('roster-count');
  const clearRosterBtn = document.getElementById('clear-roster');
  const namePreviewEl = document.getElementById('name-preview');

  // Load and display active roster state
  function loadRosterState() {
    chrome.storage.local.get(["classRoster"], (result) => {
      const roster = result.classRoster || [];
      rosterCountEl.textContent = roster.length;
      
      if (roster.length > 0) {
        namePreviewEl.style.display = "block";
        namePreviewEl.textContent = roster.slice(0, 10).join(", ") + (roster.length > 10 ? "..." : "");
      } else {
        namePreviewEl.style.display = "none";
        namePreviewEl.textContent = "";
      }
    });
  }

  // Handle Roster File Upload
  rosterFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      const text = evt.target.result;
      let names = [];

      try {
        if (file.name.endsWith('.json')) {
          names = JSON.parse(text);
          if (!Array.isArray(names)) throw new Error("JSON must be an array of strings.");
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV
          const lines = text.split(/\r?\n/);
          lines.forEach((line, index) => {
            if (!line.trim()) return;
            
            // Clean quotes
            let cleaned = line.replace(/^["']|["']$/g, '').trim();
            
            // Skip typical headers
            const lower = cleaned.toLowerCase();
            if (index === 0 && (lower.includes('name') || lower.includes('student') || lower.includes('roster'))) {
              return;
            }
            
            // Handle "LastName, FirstName"
            if (cleaned.includes(',')) {
              const parts = cleaned.split(',');
              cleaned = `${parts[1].trim()} ${parts[0].trim()}`;
            }
            
            if (cleaned) names.push(cleaned);
          });
        } else {
          // Plain Text (one name per line)
          names = text.split(/\r?\n/)
            .map(n => n.trim())
            .filter(n => n.length > 1);
        }

        // Deduplicate and filter
        const uniqueNames = [...new Set(names)].filter(Boolean);

        // Save to chrome.storage
        chrome.storage.local.set({ classRoster: uniqueNames }, () => {
          console.log("🛡️ Roster updated with", uniqueNames.length, "names.");
          loadRosterState();
        });

      } catch (err) {
        alert("Failed to parse file: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Clear active roster
  clearRosterBtn.addEventListener('click', () => {
    chrome.storage.local.set({ classRoster: [] }, () => {
      console.log("🛡️ Roster cleared.");
      loadRosterState();
    });
  });

  // Initial load
  loadRosterState();
});
