const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const actionQueuePath = path.join(process.cwd(), "src", "data", "action-queue.json");

const allowedActionTypes = [
  "call_buyer",
  "verify_stock",
  "verify_compatibility",
  "prepare_quote_draft",
  "manual_follow_up",
  "confirm_delivery",
  "close_sale",
  "block_lead"
];

const allowedPriority = [
  "low",
  "normal",
  "high",
  "urgent"
];

const allowedStatus = [
  "pending",
  "in_progress",
  "completed",
  "cancelled"
];

function ensureActionQueueFile() {
  const dir = path.dirname(actionQueuePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(actionQueuePath)) fs.writeFileSync(actionQueuePath, "[]", "utf8");
}

function readActionQueue() {
  ensureActionQueueFile();

  try {
    const parsed = JSON.parse(fs.readFileSync(actionQueuePath, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeActionQueue(actions) {
  ensureActionQueueFile();
  fs.writeFileSync(actionQueuePath, JSON.stringify(actions, null, 2), "utf8");
}

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findLead(leadId) {
  const leads = dataStore.readCollection("leads");
  return leads.find(lead => lead.id === leadId);
}

function calculateDueAt(priority, customDueAt) {
  const now = new Date();

  const custom = new Date(customDueAt);
  if (!Number.isNaN(custom.getTime())) return custom.toISOString();

  if (priority === "urgent") {
    now.setHours(now.getHours() + 1);
    return now.toISOString();
  }

  if (priority === "high") {
    now.setHours(now.getHours() + 3);
    return now.toISOString();
  }

  if (priority === "normal") {
    now.setDate(now.getDate() + 1);
    return now.toISOString();
  }

  now.setDate(now.getDate() + 3);
  return now.toISOString();
}

function validateCreateAction(input) {
  const errors = [];

  const leadId = cleanText(input.leadId);
  const actionType = cleanText(input.actionType);
  const priority = cleanText(input.priority || "normal");
  const note = cleanText(input.note);

  if (!leadId) errors.push("leadId is required.");
  if (!actionType) errors.push("actionType is required.");

  if (actionType && !allowedActionTypes.includes(actionType)) {
    errors.push(`actionType is not approved: ${actionType}`);
  }

  if (!allowedPriority.includes(priority)) {
    errors.push(`priority is not approved: ${priority}`);
  }

  if (note.length > 500) errors.push("note is too long.");

  if (leadId && !findLead(leadId)) {
    errors.push("Lead not found.");
  }

  return errors;
}

function createAction(input) {
  const errors = validateCreateAction(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Lead not found.") ? 404 : 400,
      errors
    };
  }

  const lead = findLead(cleanText(input.leadId));
  const actionType = cleanText(input.actionType);
  const priority = cleanText(input.priority || "normal");
  const now = new Date().toISOString();

  const action = {
    id: dataStore.createId("action"),
    leadId: lead.id,
    buyerName: lead.buyerName || "",
    buyerPhone: lead.phone || "",
    partNeeded: lead.partNeeded || "",
    vehicleBrand: lead.vehicleBrand || "",
    vehicleModel: lead.vehicleModel || "",
    vehicleYear: lead.vehicleYear || "",
    leadTemperature: lead.temperature || "unknown",
    pipelineStage: lead.pipelineStage || lead.status || "new",
    actionType,
    priority,
    status: "pending",
    dueAt: calculateDueAt(priority, input.customDueAt),
    note: cleanText(input.note || "Manual buyer action required."),
    assignedTo: cleanText(input.assignedTo || "admin_manual"),
    manualActionOnly: true,
    autoSendWhatsApp: false,
    sentToBuyer: false,
    quoteCreatedAutomatically: false,
    pipelineMovedAutomatically: false,
    createdAt: now,
    updatedAt: now
  };

  const actions = readActionQueue();
  actions.unshift(action);
  writeActionQueue(actions);

  return {
    ok: true,
    statusCode: 201,
    action
  };
}

function listActions() {
  return readActionQueue();
}

function getActionQueueSummary() {
  const actions = listActions();
  const now = Date.now();

  const summary = {
    totalActions: actions.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    dueNow: 0,
    urgent: 0,
    high: 0,
    manualActionOnly: 0,
    autoSendWhatsAppCount: 0,
    sentToBuyerCount: 0,
    autoQuoteCount: 0,
    autoPipelineMoveCount: 0,
    byActionType: {}
  };

  for (const action of actions) {
    const status = allowedStatus.includes(action.status) ? action.status : "pending";
    const priority = allowedPriority.includes(action.priority) ? action.priority : "normal";

    if (status === "pending") summary.pending += 1;
    if (status === "in_progress") summary.inProgress += 1;
    if (status === "completed") summary.completed += 1;
    if (status === "cancelled") summary.cancelled += 1;

    if (priority === "urgent") summary.urgent += 1;
    if (priority === "high") summary.high += 1;

    const dueTime = new Date(action.dueAt).getTime();
    if ((status === "pending" || status === "in_progress") && !Number.isNaN(dueTime) && dueTime <= now) {
      summary.dueNow += 1;
    }

    if (action.manualActionOnly === true) summary.manualActionOnly += 1;
    if (action.autoSendWhatsApp === true) summary.autoSendWhatsAppCount += 1;
    if (action.sentToBuyer === true) summary.sentToBuyerCount += 1;
    if (action.quoteCreatedAutomatically === true) summary.autoQuoteCount += 1;
    if (action.pipelineMovedAutomatically === true) summary.autoPipelineMoveCount += 1;

    const type = action.actionType || "unknown";
    summary.byActionType[type] = (summary.byActionType[type] || 0) + 1;
  }

  return {
    ...summary,
    safety: {
      manualActionOnly: true,
      autoSendWhatsApp: false,
      automaticBuyerMessage: false,
      autoCreateQuote: false,
      autoMovePipelineStage: false
    }
  };
}

module.exports = {
  allowedActionTypes,
  allowedPriority,
  allowedStatus,
  createAction,
  listActions,
  getActionQueueSummary
};
