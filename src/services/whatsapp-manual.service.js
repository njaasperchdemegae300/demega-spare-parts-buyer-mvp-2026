const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const whatsappLinksPath = path.join(process.cwd(), "src", "data", "whatsapp-manual-links.json");

function ensureFile() {
  const dir = path.dirname(whatsappLinksPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(whatsappLinksPath)) fs.writeFileSync(whatsappLinksPath, "[]", "utf8");
}

function readLinks() {
  ensureFile();

  try {
    const parsed = JSON.parse(fs.readFileSync(whatsappLinksPath, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLinks(links) {
  ensureFile();
  fs.writeFileSync(whatsappLinksPath, JSON.stringify(links, null, 2), "utf8");
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

function normalizeNigeriaPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("234")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `234${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `234${digits}`;
  }

  return digits;
}

function isBlockedAutomationRequest(input) {
  return input.autoSendWhatsApp === true ||
    input.sendNow === true ||
    input.autoOpenBrowser === true ||
    input.openAutomatically === true ||
    input.messageBuyerAutomatically === true;
}

function hasPriceOrQuoteRequest(input) {
  return Boolean(
    input.price ||
    input.quotePrice ||
    input.quoteAmount ||
    input.amount ||
    input.finalPrice ||
    input.sendQuoteNow
  );
}

function buildSafeManualMessage(lead) {
  const buyerName = cleanText(lead.buyerName || "there");
  const partNeeded = cleanText(lead.partNeeded || "the part");
  const vehicle = cleanText([
    lead.vehicleBrand,
    lead.vehicleModel,
    lead.vehicleYear,
    lead.engineCode ? `Engine: ${lead.engineCode}` : ""
  ].filter(Boolean).join(" "));

  const vehicleLine = vehicle ? ` for ${vehicle}` : "";

  return [
    `Hello ${buyerName}, this is Demega Spare Parts.`,
    `I saw your request for ${partNeeded}${vehicleLine}.`,
    "Please confirm the exact part photo, socket/plug, part number, or engine code so we can verify stock and compatibility before price.",
    "No quote will be given until stock and compatibility are confirmed."
  ].join(" ");
}

function validateManualLinkRequest(input) {
  const errors = [];
  const leadId = cleanText(input.leadId);

  if (!leadId) errors.push("leadId is required.");

  if (isBlockedAutomationRequest(input)) {
    errors.push("Automatic WhatsApp sending/opening is blocked. Manual open only.");
  }

  if (hasPriceOrQuoteRequest(input)) {
    errors.push("Price/quote is blocked at this stage. Confirm stock and compatibility first.");
  }

  if (leadId && !findLead(leadId)) {
    errors.push("Lead not found.");
  }

  const lead = leadId ? findLead(leadId) : null;
  const phone = normalizeNigeriaPhone(lead ? lead.phone : "");

  if (lead && phone.length < 10) {
    errors.push("Lead phone number is invalid for WhatsApp link preparation.");
  }

  return errors;
}

function createManualWhatsAppLink(input) {
  const errors = validateManualLinkRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Lead not found.") ? 404 : 400,
      errors
    };
  }

  const lead = findLead(cleanText(input.leadId));
  const phone = normalizeNigeriaPhone(lead.phone);
  const message = buildSafeManualMessage(lead);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
  const now = new Date().toISOString();

  const record = {
    id: dataStore.createId("wa_manual"),
    leadId: lead.id,
    buyerName: cleanText(lead.buyerName),
    buyerPhone: cleanText(lead.phone),
    normalizedWhatsappPhone: phone,
    partNeeded: cleanText(lead.partNeeded),
    vehicleBrand: cleanText(lead.vehicleBrand),
    vehicleModel: cleanText(lead.vehicleModel),
    vehicleYear: cleanText(lead.vehicleYear),
    engineCode: cleanText(lead.engineCode),
    location: cleanText(lead.location),
    source: cleanText(lead.source),
    message,
    whatsappUrl,
    manualOpenOnly: true,
    manualReviewRequired: true,
    autoSendWhatsApp: false,
    autoOpenBrowser: false,
    automaticBuyerMessage: false,
    sentToBuyer: false,
    priceIncluded: false,
    quoteCreatedAutomatically: false,
    stockConfirmationRequiredBeforeQuote: true,
    compatibilityConfirmationRequiredBeforeQuote: true,
    createdBy: cleanText(input.createdBy || "admin_manual"),
    createdAt: now
  };

  const links = readLinks();
  links.unshift(record);
  writeLinks(links);

  return {
    ok: true,
    statusCode: 201,
    link: record
  };
}

function listManualWhatsAppLinks() {
  return readLinks();
}

function getManualWhatsAppSummary() {
  const links = listManualWhatsAppLinks();

  return {
    totalManualLinks: links.length,
    manualOpenOnly: links.filter(item => item.manualOpenOnly === true).length,
    manualReviewRequired: links.filter(item => item.manualReviewRequired === true).length,
    autoSendWhatsAppCount: links.filter(item => item.autoSendWhatsApp === true).length,
    autoOpenBrowserCount: links.filter(item => item.autoOpenBrowser === true).length,
    automaticBuyerMessageCount: links.filter(item => item.automaticBuyerMessage === true).length,
    sentToBuyerCount: links.filter(item => item.sentToBuyer === true).length,
    priceIncludedCount: links.filter(item => item.priceIncluded === true).length,
    autoQuoteCount: links.filter(item => item.quoteCreatedAutomatically === true).length,
    safety: {
      manualOpenOnly: true,
      manualReviewRequired: true,
      autoSendWhatsApp: false,
      autoOpenBrowser: false,
      automaticBuyerMessage: false,
      sentToBuyer: false,
      priceIncluded: false,
      autoCreateQuote: false,
      quoteBeforeStockConfirmation: false,
      quoteBeforeCompatibilityConfirmation: false
    }
  };
}

module.exports = {
  createManualWhatsAppLink,
  listManualWhatsAppLinks,
  getManualWhatsAppSummary,
  normalizeNigeriaPhone,
  buildSafeManualMessage
};
