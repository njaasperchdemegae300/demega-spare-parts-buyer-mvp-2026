const dataStore = require("./data-store");

const allowedFollowUpTypes = [
  "same_day",
  "next_day",
  "three_days",
  "one_week",
  "custom"
];

const allowedFollowUpStatus = [
  "pending",
  "completed",
  "cancelled"
];

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

function calculateDueAt(type, customDueAt) {
  const now = new Date();

  if (type === "same_day") {
    now.setHours(now.getHours() + 3);
    return now.toISOString();
  }

  if (type === "next_day") {
    now.setDate(now.getDate() + 1);
    return now.toISOString();
  }

  if (type === "three_days") {
    now.setDate(now.getDate() + 3);
    return now.toISOString();
  }

  if (type === "one_week") {
    now.setDate(now.getDate() + 7);
    return now.toISOString();
  }

  const custom = new Date(customDueAt);
  if (!Number.isNaN(custom.getTime())) {
    return custom.toISOString();
  }

  now.setDate(now.getDate() + 1);
  return now.toISOString();
}

function validateCreateFollowUp(input) {
  const errors = [];

  const leadId = cleanText(input.leadId);
  const followUpType = cleanText(input.followUpType || "next_day");
  const note = cleanText(input.note);

  if (!leadId) errors.push("leadId is required.");

  if (!allowedFollowUpTypes.includes(followUpType)) {
    errors.push(`followUpType is not approved: ${followUpType}`);
  }

  if (note.length > 500) errors.push("note is too long.");

  if (leadId && !findLead(leadId)) {
    errors.push("Lead not found.");
  }

  return errors;
}

function createFollowUp(input) {
  const errors = validateCreateFollowUp(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Lead not found.") ? 404 : 400,
      errors
    };
  }

  const lead = findLead(cleanText(input.leadId));
  const followUpType = cleanText(input.followUpType || "next_day");
  const now = new Date().toISOString();

  const followUp = {
    id: dataStore.createId("follow"),
    leadId: lead.id,
    buyerName: lead.buyerName,
    buyerPhone: lead.phone,
    partNeeded: lead.partNeeded,
    vehicleBrand: lead.vehicleBrand,
    vehicleModel: lead.vehicleModel,
    leadTemperature: lead.temperature || "unknown",
    pipelineStage: lead.pipelineStage || lead.status || "new",
    followUpType,
    dueAt: calculateDueAt(followUpType, input.customDueAt),
    note: cleanText(input.note || "Manual follow-up required."),
    status: "pending",
    manualActionOnly: true,
    autoSendWhatsApp: false,
    sentToBuyer: false,
    quoteCreatedAutomatically: false,
    createdBy: cleanText(input.createdBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const followUps = dataStore.readCollection("followups");
  followUps.unshift(followUp);
  dataStore.writeCollection("followups", followUps);

  return {
    ok: true,
    statusCode: 201,
    followUp
  };
}

function listFollowUps() {
  return dataStore.readCollection("followups");
}

function getFollowUpSummary() {
  const followUps = listFollowUps();
  const now = Date.now();

  const summary = {
    totalFollowUps: followUps.length,
    pending: 0,
    dueNow: 0,
    completed: 0,
    cancelled: 0,
    manualActionOnly: 0,
    autoSendWhatsAppCount: 0,
    sentToBuyerCount: 0,
    byType: {}
  };

  for (const item of followUps) {
    const status = allowedFollowUpStatus.includes(item.status) ? item.status : "pending";

    if (status === "pending") summary.pending += 1;
    if (status === "completed") summary.completed += 1;
    if (status === "cancelled") summary.cancelled += 1;

    const dueTime = new Date(item.dueAt).getTime();
    if (status === "pending" && !Number.isNaN(dueTime) && dueTime <= now) {
      summary.dueNow += 1;
    }

    if (item.manualActionOnly === true) summary.manualActionOnly += 1;
    if (item.autoSendWhatsApp === true) summary.autoSendWhatsAppCount += 1;
    if (item.sentToBuyer === true) summary.sentToBuyerCount += 1;

    const type = item.followUpType || "unknown";
    summary.byType[type] = (summary.byType[type] || 0) + 1;
  }

  return {
    ...summary,
    safety: {
      autoSendWhatsApp: false,
      automaticReminderSending: false,
      manualActionOnly: true
    }
  };
}

module.exports = {
  allowedFollowUpTypes,
  allowedFollowUpStatus,
  createFollowUp,
  listFollowUps,
  getFollowUpSummary
};
