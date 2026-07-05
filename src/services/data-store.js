const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "src", "data");

const collections = {
  leads: "leads.json",
  inventory: "inventory.json",
  quotes: "quotes.json",
  followups: "followups.json"
};

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const file of Object.values(collections)) {
    const fullPath = path.join(DATA_DIR, file);

    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, "[]", "utf8");
    }
  }
}

function getCollectionPath(collectionName) {
  if (!collections[collectionName]) {
    throw new Error(`Unknown collection: ${collectionName}`);
  }

  return path.join(DATA_DIR, collections[collectionName]);
}

function readCollection(collectionName) {
  ensureDataDir();

  const filePath = getCollectionPath(collectionName);
  const raw = fs.readFileSync(filePath, "utf8").trim() || "[]";

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`${collectionName} storage must be an array.`);
  }

  return parsed;
}

function writeCollection(collectionName, records) {
  ensureDataDir();

  if (!Array.isArray(records)) {
    throw new Error("records must be an array.");
  }

  const filePath = getCollectionPath(collectionName);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");

  return records;
}

function createId(prefix) {
  const time = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}_${random}`;
}

function countAll() {
  ensureDataDir();

  return {
    leads: readCollection("leads").length,
    inventory: readCollection("inventory").length,
    quotes: readCollection("quotes").length,
    followups: readCollection("followups").length
  };
}

module.exports = {
  collections,
  ensureDataDir,
  readCollection,
  writeCollection,
  createId,
  countAll
};
