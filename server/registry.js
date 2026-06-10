const fs = require('fs');

function validateProjects(data) {
  if (!Array.isArray(data)) throw new Error('projects.json must be an array');
  for (const p of data) {
    if (typeof p.id !== 'string' || !p.id) throw new Error('every project needs a string "id"');
    if (typeof p.name !== 'string' || !p.name) throw new Error(`project "${p.id}": missing "name"`);
    if (typeof p.adminUrl !== 'string' || !p.adminUrl) throw new Error(`project "${p.id}": missing "adminUrl"`);
  }
  return data;
}

// Re-reads the file on every load() so edits apply without a restart.
// On any read/parse/validation error, serves the last good list.
function createRegistry(filePath) {
  let lastGood = [];
  return {
    load() {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        lastGood = validateProjects(JSON.parse(raw));
      } catch (err) {
        console.error(`[registry] keeping last good list (${lastGood.length} projects): ${err.message}`);
      }
      return lastGood;
    },
  };
}

module.exports = { createRegistry };
