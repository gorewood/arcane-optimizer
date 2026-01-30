#!/usr/bin/env node
/**
 * merge-user-export.cjs
 *
 * Merges a user data export file into the bundled game data files.
 *
 * WHY THIS EXISTS:
 * When testing or collecting new game data, we export user data from the app's
 * Data Management panel. This export contains items that should be merged into
 * the bundled data that ships with the app. This script automates that merge.
 *
 * WHAT IT DOES:
 * 1. Reads the bundled JSON files and the user export file
 * 2. For items with matching IDs: updates bundled data with export data (export wins)
 * 3. For new items: adds them to bundled data
 * 4. For user-created items (IDs starting with "user-"): converts to proper bundled IDs
 *    by slugifying the item name (e.g., "Range Amulet (Fair)" -> "range-amulet-fair")
 * 5. Preserves original ordering of existing items, appends new items at the end
 *
 * FILES MERGED:
 * - equipment.json     (array of equipment pieces)
 * - enchantments.json  (array of enchantments)
 * - modifiers.json     (array of modifiers)
 * - gems.json          (array of gems)
 * - variant-types.json (keyed object of variant types)
 *
 * USAGE:
 *   just merge-export <export-file>
 *
 * EXAMPLES:
 *   just merge-export history/ao-user-data-1769744278621.json
 *   just merge-export ~/Downloads/my-export.json
 *
 * AFTER RUNNING:
 * - Run `just check` to verify the merge didn't break anything
 * - Review the git diff to sanity-check changes
 * - Commit the updated files
 */

const fs = require('fs');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATA_DIR = 'src/data';

const FILES = {
  equipment: `${DATA_DIR}/equipment.json`,
  enchantments: `${DATA_DIR}/enchantments.json`,
  modifiers: `${DATA_DIR}/modifiers.json`,
  gems: `${DATA_DIR}/gems.json`,
  variantTypes: `${DATA_DIR}/variant-types.json`,
};

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

/**
 * Merge an array of items by ID.
 * Returns { result, updated, added, remaps }.
 */
function mergeArrayById(bundled, exported) {
  const bundledMap = new Map(bundled.map(item => [item.id, item]));
  const remaps = [];
  let updated = 0;
  let added = 0;

  // Build remap table for user-created IDs
  const userIdRemap = {};
  for (const item of exported) {
    if (isUserCreatedId(item.id)) {
      const newId = slugify(item.name);
      userIdRemap[item.id] = newId;
      remaps.push({ name: item.name, oldId: item.id, newId });
    }
  }

  // Process exported items
  for (const item of exported) {
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

  // Convert back to array, preserving original order
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

  return { result, updated, added, remaps };
}

/**
 * Merge a keyed object (variant types).
 * Returns { result, updated, added }.
 */
function mergeKeyedObject(bundled, exported) {
  const result = { ...bundled };
  let updated = 0;
  let added = 0;

  for (const [key, value] of Object.entries(exported)) {
    if (key in bundled) {
      result[key] = value;
      updated++;
    } else {
      result[key] = value;
      added++;
    }
  }

  return { result, updated, added };
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

  // Validate export file exists
  if (!fs.existsSync(exportPath)) {
    console.error(`Error: Export file not found: ${exportPath}`);
    process.exit(1);
  }

  // Validate we're in project root
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Error: Data directory not found: ${DATA_DIR}`);
    console.error('Are you running this from the project root?');
    process.exit(1);
  }

  // Load export file
  console.log(`Loading export from ${exportPath}...`);
  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));

  const stats = {
    equipment: { updated: 0, added: 0 },
    enchantments: { updated: 0, added: 0 },
    modifiers: { updated: 0, added: 0 },
    gems: { updated: 0, added: 0 },
    variantTypes: { updated: 0, added: 0 },
  };

  const allRemaps = [];

  // Merge equipment
  if (exported.equipment && exported.equipment.length > 0) {
    console.log(`\nMerging equipment...`);
    const bundled = JSON.parse(fs.readFileSync(FILES.equipment, 'utf8'));
    const { result, updated, added, remaps } = mergeArrayById(bundled, exported.equipment);
    fs.writeFileSync(FILES.equipment, JSON.stringify(result, null, 2) + '\n');
    stats.equipment = { updated, added, total: result.length };
    allRemaps.push(...remaps.map(r => ({ type: 'equipment', ...r })));
  }

  // Merge enchantments
  if (exported.enchantments && exported.enchantments.length > 0) {
    console.log(`Merging enchantments...`);
    const bundled = JSON.parse(fs.readFileSync(FILES.enchantments, 'utf8'));
    const { result, updated, added, remaps } = mergeArrayById(bundled, exported.enchantments);
    fs.writeFileSync(FILES.enchantments, JSON.stringify(result, null, 2) + '\n');
    stats.enchantments = { updated, added, total: result.length };
    allRemaps.push(...remaps.map(r => ({ type: 'enchantment', ...r })));
  }

  // Merge modifiers
  if (exported.modifiers && exported.modifiers.length > 0) {
    console.log(`Merging modifiers...`);
    const bundled = JSON.parse(fs.readFileSync(FILES.modifiers, 'utf8'));
    const { result, updated, added, remaps } = mergeArrayById(bundled, exported.modifiers);
    fs.writeFileSync(FILES.modifiers, JSON.stringify(result, null, 2) + '\n');
    stats.modifiers = { updated, added, total: result.length };
    allRemaps.push(...remaps.map(r => ({ type: 'modifier', ...r })));
  }

  // Merge gems
  if (exported.gems && exported.gems.length > 0) {
    console.log(`Merging gems...`);
    const bundled = JSON.parse(fs.readFileSync(FILES.gems, 'utf8'));
    const { result, updated, added, remaps } = mergeArrayById(bundled, exported.gems);
    fs.writeFileSync(FILES.gems, JSON.stringify(result, null, 2) + '\n');
    stats.gems = { updated, added, total: result.length };
    allRemaps.push(...remaps.map(r => ({ type: 'gem', ...r })));
  }

  // Merge variant types (keyed object, not array)
  if (exported.variantTypes && Object.keys(exported.variantTypes).length > 0) {
    console.log(`Merging variant types...`);
    const bundled = JSON.parse(fs.readFileSync(FILES.variantTypes, 'utf8'));
    const { result, updated, added } = mergeKeyedObject(bundled, exported.variantTypes);
    fs.writeFileSync(FILES.variantTypes, JSON.stringify(result, null, 2) + '\n');
    stats.variantTypes = { updated, added, total: Object.keys(result).length };
  }

  // Print ID remaps
  console.log('\n' + '='.repeat(60));
  console.log('ID Remapping (user-created items):');
  if (allRemaps.length === 0) {
    console.log('  (none)');
  } else {
    for (const r of allRemaps) {
      console.log(`  [${r.type}] ${r.name}`);
      console.log(`    ${r.oldId} -> ${r.newId}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Merge Summary:');
  console.log('');

  const types = ['equipment', 'enchantments', 'modifiers', 'gems', 'variantTypes'];
  let anyChanges = false;

  for (const type of types) {
    const s = stats[type];
    if (s.updated > 0 || s.added > 0) {
      anyChanges = true;
      console.log(`  ${type}:`);
      if (s.updated > 0) console.log(`    Updated: ${s.updated}`);
      if (s.added > 0) console.log(`    Added:   ${s.added}`);
      if (s.total) console.log(`    Total:   ${s.total}`);
    }
  }

  if (!anyChanges) {
    console.log('  No changes (export was empty or matched existing data)');
  }

  console.log('');
  console.log('Next steps:');
  console.log('  1. Run `just check` to verify quality gates');
  console.log('  2. Review changes with `git diff src/data/`');
  console.log('  3. Commit when satisfied');
}

main();
