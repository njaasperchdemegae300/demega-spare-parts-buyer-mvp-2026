const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const allowedStages = [
  "new",
  "manual_review",
  "inventory_matching",
  "quote_draft_ready",
  "manual_contacted",
  "follow_up_needed",
  "won",
  "lost",
  "blocked"
];

const pipelineEventsPath = path.join(process.cwd(), "src", "data", "pipeline-events.json");

function ensurePipelineEventsFile() {
  const dir = path.dirname(pipelineEventsPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(pipelineEventsPath)) fs.writeFileSync(pipelineEventsPath, "[]", "utf8");
}

function readPipelineEvents() {
  ensurePipelineEventsFile();

  try {
    const parsed = JSON.parse(fs.readFileSync(pipelineEventsPath, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePipelineEvents(events) {
  ensurePipelineEventsFile();
  fs.writeFileSync(pipelineEventsPath, JSON.stringify(events, null, 2), "utf8");
}

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getLeadStage(lead) {
  return allowedStages.includes(lead.pipelineStage) ? lead.pipelineStage : "new";
}

function getPipelineSummary() {
  const leads = dataStore.readCollection("leads");
  const events = readPipelineEvents();

  const byStage = {};
  for (const stage of allowedStages) byStage[stage] = 0;

  let hotLeads = 0;
  let followUpNeeded = 0;
  let manualReviewRequired = 0;

  for (const lead of leads) {
    const stage = getLeadStage(lead);
    byStage[stage] = (byStage[stage] || 0) + 1;

    if (lead.temperature === "hot") hotLeads += 1;
    if (stage === "follow_up_needed") followUpNeeded += 1;
    if (lead.manualReviewRequired === true) manualReviewRequired += 1;
  }

  return {
    totalLeads: leads.length,
    totalPipelineEvents: events.length,
    hotLeads,
    followUpNeeded,
    manualReviewRequired,
    byStage,
    safety: {
      autoSendWhatsApp: false,
      autoCreateQuote: false,
      manualActionOnly: true
    }
  };
}

function moveLeadStage(input) {
  const leadId = cleanText(input.leadId);
  const nextStage = cleanText(input.nextStage);
  const note = cleanText(input.note);
  const changedBy = cleanText(input.changedBy || "admin_manual");

  if (!leadId) {
    return { ok: false, statusCode: 400, errors: ["leadId is required."] };
  }

  if (!allowedStages.includes(nextStage)) {
    return { ok: false, statusCode: 400, errors: [`Invalid pipeline stage: ${nextStage}`] };
  }

  if (note.length > 500) {
    return { ok: false, statusCode: 400, errors: ["note is too long."] };
  }

  const leads = dataStore.readCollection("leads");
  const index = leads.findIndex(lead => lead.id === leadId);

  if (index === -1) {
    return { ok: false, statusCode: 404, errors: ["Lead not found."] };
  }

  const oldLead = leads[index];
  const fromStage = getLeadStage(oldLead);
  const now = new Date().toISOString();

  const updatedLead = {
    ...oldLead,
    pipelineStage: nextStage,
    pipelineUpdatedAt: now,
    status: nextStage,
    manualReviewRequired: true,
    autoSendWhatsApp: false,
    sentToBuyer: false,
    quoteCreatedAutomatically: false,
    updatedAt: now
  };

  leads[index] = updatedLead;
  dataStore.writeCollection("leads", leads);

  const event = {
    id: dataStore.createId("pipe"),
    leadId: updatedLead.id,
    buyerName: updatedLead.buyerName || "",
    buyerPhone: updatedLead.phone || "",
    partNeeded: updatedLead.partNeeded || "",
    fromStage,
    toStage: nextStage,
    note,
    changedBy,
    manualActionOnly: true,
    autoSendWhatsApp: false,
    sentToBuyer: false,
    quoteCreatedAutomatically: false,
    createdAt: now
  };

  const events = readPipelineEvents();
  events.unshift(event);
  writePipelineEvents(events);

  return {
    ok: true,
    statusCode: 200,
    lead: updatedLead,
    event
  };
}

function listPipelineEvents() {
  return readPipelineEvents();
}

module.exports = {
  allowedStages,
  getPipelineSummary,
  moveLeadStage,
  listPipelineEvents
};
