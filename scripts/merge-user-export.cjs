#!/usr/bin/env node
/**
 * merge-user-export.cjs
 *
 * Merges a user data export file into the bundled game data (equipment.json).
 *
 * WHY THIS EXISTS:
 * When testing or collecting new game data, we export user data from the app's
 * Data Management panel. This export contains equipment items that should be
 * merged into the bundled data that ships with the app. This script automates
 * that merge process.
 *
 * WHAT IT DOES:
 * 1. Reads the bundled equipment.json and the user export file
 * 2. For items with matching IDs: updates bundled data with export data (export wins)
 * 3. For new items: adds them to bundled data
 * 4. For user-created items (IDs starting with "user-"): converts to proper bundled IDs
 *    by slugifying the item name (e.g., "Range Amulet (Fair)" -> "range-amulet-fair")
 * 5. Preserves original ordering of existing items, appends new items at the end
 *
 * USAGE:
 *   node scripts/merge-user-export.js <export-file>
 *
 * EXAMPLES:
 *   node scripts/merge-user-export.js history/ao-user-data-1769744278621.json
 *   node scripts/merge-user-export.js ~/Downloads/my-export.json
 *
 * The script will:
 * - Print what IDs are being remapped (for user-created items)
 * - Print counts of updated vs added items
 * - Write the merged result to src/data/equipment.json
 *
 * AFTER RUNNING:
 * - Run `just check` to verify the merge didn't break anything
 * - Review the git diff to sanity-check changes
 * - Commit the updated equipment.json
 */

const fs = require('fs');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EQUIPMENT_PATH = 'src/data/equipment.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a name to a URL-safe slug ID.
 * "Range Amulet (Fair)" -> "range-amulet-fair"
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Check if an ID is a user-created ID (needs remapping).
 */
function isUserCreatedId(id) {
  return id.startsWith('user-');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error('Usage: just merge-export <export-file>');
    console.error('');
    console.error('Example:');
    console.error('  just merge-export history/ao-user-data-1769744278621.json');
    process.exit(1);
  }

  const exportPath = args[0];

  // Validate files exist
  if (!fs.existsSync(exportPath)) {
    console.error(`Error: Export file not found: ${exportPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(EQUIPMENT_PATH)) {
    console.error(`Error: Bundled equipment file not found: ${EQUIPMENT_PATH}`);
    console.error('Are you running this from the project root?');
    process.exit(1);
  }

  // Load files
  console.log(`Loading bundled data from ${EQUIPMENT_PATH}...`);
  const bundled = JSON.parse(fs.readFileSync(EQUIPMENT_PATH, 'utf8'));

  console.log(`Loading export from ${exportPath}...`);
  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));

  if (!exported.equipment || !Array.isArray(exported.equipment)) {
    console.error('Error: Export file does not contain an equipment array');
    console.error('Expected format: { "equipment": [...], ... }');
    process.exit(1);
  }

  // Create map of bundled by ID
  const bundledMap = new Map(bundled.map(item => [item.id, item]));

  // Build remap table for user-created IDs
  console.log('');
  console.log('ID Remapping (user-created items):');
  const userIdRemap = {};
  let hasRemaps = false;

  for (const item of exported.equipment) {
    if (isUserCreatedId(item.id)) {
      const newId = slugify(item.name);
      userIdRemap[item.id] = newId;
      console.log(`  ${item.name}`);
      console.log(`    ${item.id} -> ${newId}`);
      hasRemaps = true;
    }
  }

  if (!hasRemaps) {
    console.log('  (none)');
  }

  // Process exported equipment
  let updated = 0;
  let added = 0;

  for (const item of exported.equipment) {
    let id = item.id;

    // Remap user IDs to proper slugified IDs
    if (userIdRemap[id]) {
      id = userIdRemap[id];
    }

    const merged = { ...item, id };

    if (bundledMap.has(id)) {
      bundledMap.set(id, merged);
      updated++;
    } else {
      bundledMap.set(id, merged);
      added++;
    }
  }

  // Convert back to array, preserving original order for existing items
  const result = [];
  const seen = new Set();

  // First: existing items in original order (with updates applied)
  for (const item of bundled) {
    if (bundledMap.has(item.id)) {
      result.push(bundledMap.get(item.id));
      seen.add(item.id);
    }
  }

  // Then: new items at the end
  for (const [id, item] of bundledMap) {
    if (!seen.has(id)) {
      result.push(item);
    }
  }

  // Write result
  fs.writeFileSync(EQUIPMENT_PATH, JSON.stringify(result, null, 2) + '\n');

  // Summary
  console.log('');
  console.log('Merge complete:');
  console.log(`  Updated: ${updated} items`);
  console.log(`  Added:   ${added} items`);
  console.log(`  Total:   ${result.length} items`);
  console.log('');
  console.log(`Written to ${EQUIPMENT_PATH}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run `just check` to verify quality gates');
  console.log('  2. Review changes with `git diff src/data/equipment.json`');
  console.log('  3. Commit when satisfied');
}

main();
