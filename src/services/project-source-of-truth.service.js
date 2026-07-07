const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const sourceFiles = [
  {
    key: "startHere",
    file: "START_HERE_EVERY_CHAT.md",
    requiredPhrases: [
      "START HERE EVERY CHAT",
      "Current Safe Version",
      "Hard Rule"
    ]
  },
  {
    key: "masterPlan",
    file: "PROJECT_MASTER_PLAN_2026.md",
    requiredPhrases: [
      "PROJECT MASTER PLAN 2026",
      "Core Business Flow",
      "Current Phase"
    ]
  },
  {
    key: "projectMap",
    file: "PROJECT_MAP_2026.md",
    requiredPhrases: [
      "Version 24C",
      "Version 25A"
    ]
  },
  {
    key: "phaseLog",
    file: "PHASE_LOG.md",
    requiredPhrases: [
      "PHASE LOG",
      "Version 24C",
      "Version 25A"
    ]
  },
  {
    key: "decisionRegister",
    file: "DECISION_REGISTER.md",
    requiredPhrases: [
      "DECISION REGISTER",
      "No Auto-Send",
      "Version Gate Required"
    ]
  },
  {
    key: "trafficSourceRegistry",
    file: "TRAFFIC_SOURCE_REGISTRY.md",
    requiredPhrases: [
      "Approved Buyer-Intent Sources",
      "Market Intelligence Only",
      "Blocked Traffic Methods"
    ]
  },
  {
    key: "safetyRules",
    file: "SAFETY_RULES.md",
    requiredPhrases: [
      "SAFETY RULES",
      "No auto-send",
      "Manual final business review only"
    ]
  },
  {
    key: "versionGateRules",
    file: "VERSION_GATE_RULES.md",
    requiredPhrases: [
      "VERSION GATE RULES",
      "Approval Rule",
      "Block Rule"
    ]
  },
  {
    key: "latestStatus",
    file: "LATEST_STATUS.md",
    requiredPhrases: [
      "LATEST STATUS",
      "Current Phase",
      "Current Verdict"
    ]
  },
  {
    key: "projectHandover",
    file: "docs/PROJECT_HANDOVER_2026.md",
    requiredPhrases: [
      "PROJECT HANDOVER 2026",
      "How To Continue",
      "Must Not Do"
    ]
  }
];

function readFileSafe(relativePath) {
  const filePath = path.join(ROOT, relativePath);

  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      content: "",
      size: 0
    };
  }

  const content = fs.readFileSync(filePath, "utf8");

  return {
    exists: true,
    content,
    size: Buffer.byteLength(content, "utf8")
  };
}

function inspectSourceFile(config) {
  const read = readFileSafe(config.file);
  const missingPhrases = read.exists
    ? config.requiredPhrases.filter(phrase => !read.content.includes(phrase))
    : config.requiredPhrases.slice();

  return {
    key: config.key,
    file: config.file,
    exists: read.exists,
    size: read.size,
    requiredPhrases: config.requiredPhrases,
    missingPhrases,
    valid: read.exists && missingPhrases.length === 0
  };
}

function listProjectSourceOfTruthFiles() {
  return sourceFiles.map(inspectSourceFile);
}

function getProjectSourceOfTruthSummary() {
  const files = listProjectSourceOfTruthFiles();
  const missingFiles = files.filter(item => !item.exists).map(item => item.file);
  const invalidFiles = files.filter(item => !item.valid).map(item => item.file);

  return {
    projectName: "Spare-parts-bulk-buyer_Engine_2026 Ai Morden",
    currentPhase: "Version 25A — Project Source-of-Truth Handover System Foundation",
    nextPhase: "Version 25B — Source-of-Truth Dashboard / Handover Display",
    totalSourceFiles: files.length,
    existingSourceFiles: files.filter(item => item.exists).length,
    validSourceFiles: files.filter(item => item.valid).length,
    missingFiles,
    invalidFiles,
    sourceOfTruthReady: missingFiles.length === 0 && invalidFiles.length === 0,
    readOrder: [
      "START_HERE_EVERY_CHAT.md",
      "LATEST_STATUS.md",
      "PROJECT_MAP_2026.md",
      "PROJECT_MASTER_PLAN_2026.md",
      "SAFETY_RULES.md",
      "VERSION_GATE_RULES.md",
      "PHASE_LOG.md",
      "DECISION_REGISTER.md",
      "TRAFFIC_SOURCE_REGISTRY.md",
      "docs/PROJECT_HANDOVER_2026.md"
    ],
    safety: {
      sourceOfTruthOnly: true,
      handoverSystemOnly: true,
      readOnlySummary: true,
      noAutoSend: true,
      noSpam: true,
      noUnsolicitedWhatsApp: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noBuyerMessageReading: true,
      noWhatsappScraping: true,
      noAutomaticQuoteSending: true,
      noInventoryUpdate: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true,
      manualReviewRequired: true
    }
  };
}

function getProjectSourceOfTruthPreview() {
  return {
    status: "ok",
    message: "Project Source-of-Truth Handover System Foundation is active.",
    purpose: "Keep the project understandable across chats, prevent memory confusion, and force safe version-gated continuation.",
    requiredFiles: sourceFiles.map(item => item.file),
    nextPhase: "Version 25B — Source-of-Truth Dashboard / Handover Display",
    rules: [
      "Do not continue from chat memory alone.",
      "Read source-of-truth files before coding.",
      "Do not move to the next version without an APPROVED smoke test.",
      "Do not auto-send WhatsApp.",
      "Do not scrape private data.",
      "Do not create accounting entries automatically.",
      "Do not update inventory automatically.",
      "Do not close sales automatically.",
      "Do not move pipeline automatically."
    ]
  };
}

module.exports = {
  listProjectSourceOfTruthFiles,
  getProjectSourceOfTruthSummary,
  getProjectSourceOfTruthPreview
};
