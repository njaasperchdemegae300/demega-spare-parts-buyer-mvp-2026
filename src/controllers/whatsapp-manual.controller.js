const readJsonBody = require("../utils/read-json-body");
const whatsappManualService = require("../services/whatsapp-manual.service");

function whatsappManualPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "WhatsApp Manual Open Link Foundation is active.",
    rules: [
      "Manual open link only.",
      "No WhatsApp auto-send.",
      "No automatic browser opening.",
      "No automatic buyer message.",
      "No price/quote before stock confirmation.",
      "No price/quote before compatibility confirmation."
    ]
  });
}

async function createWhatsappManualLinkController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = whatsappManualService.createManualWhatsAppLink(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "WhatsApp manual open link prepared safely. User must open and send manually.",
      link: result.link
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listWhatsappManualLinksController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    links: whatsappManualService.listManualWhatsAppLinks()
  });
}

function whatsappManualSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: whatsappManualService.getManualWhatsAppSummary()
  });
}

module.exports = {
  whatsappManualPreviewController,
  createWhatsappManualLinkController,
  listWhatsappManualLinksController,
  whatsappManualSummaryController
};
