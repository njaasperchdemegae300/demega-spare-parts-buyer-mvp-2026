const readJsonBody = require("../utils/read-json-body");
const buyerIntake = require("../services/buyer-intake.service");

async function createBuyerLeadController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const errors = buyerIntake.validateBuyerLead(body);

    if (errors.length) {
      return sendJson(res, 400, {
        status: "failed",
        errors
      });
    }

    const lead = buyerIntake.createBuyerLead(body);

    return sendJson(res, 201, {
      status: "created",
      message: "Buyer lead captured safely. Manual review is required before reply.",
      lead
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listBuyerLeadsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    leads: buyerIntake.listLeads()
  });
}

module.exports = {
  createBuyerLeadController,
  listBuyerLeadsController
};
