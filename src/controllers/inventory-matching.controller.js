const readJsonBody = require("../utils/read-json-body");
const matchingService = require("../services/inventory-matching.service");

async function matchInventoryController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);

    if (body.leadId) {
      const result = matchingService.matchInventoryByLeadId(body.leadId);

      if (!result) {
        return sendJson(res, 404, {
          status: "failed",
          error: "Lead not found."
        });
      }

      return sendJson(res, 200, {
        status: "ok",
        result
      });
    }

    const result = matchingService.matchInventoryForLead(body);

    return sendJson(res, 200, {
      status: "ok",
      result
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function matchingPreviewController(req, res, sendJson) {
  const sampleLead = {
    id: "sample-lead",
    buyerName: "Sample Buyer",
    partNeeded: "1ZZ alternator",
    vehicleBrand: "Toyota",
    vehicleModel: "Corolla",
    vehicleYear: "2005",
    engineCode: "1ZZ",
    location: "Lagos"
  };

  const result = matchingService.matchInventoryForLead(sampleLead);

  return sendJson(res, 200, {
    status: "ok",
    message: "Inventory matching engine is working.",
    result
  });
}

module.exports = {
  matchInventoryController,
  matchingPreviewController
};
