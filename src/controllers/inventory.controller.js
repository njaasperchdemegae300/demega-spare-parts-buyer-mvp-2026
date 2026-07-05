const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const inventoryService = require("../services/inventory.service");

function inventoryPageController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "inventory-command-center.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Inventory command center file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function listInventoryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    inventory: inventoryService.listInventory()
  });
}

async function createInventoryController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const errors = inventoryService.validateInventoryItem(body);

    if (errors.length) {
      return sendJson(res, 400, {
        status: "failed",
        errors
      });
    }

    const item = inventoryService.createInventoryItem(body);

    return sendJson(res, 201, {
      status: "created",
      message: "Inventory item saved. Manual review and compatibility confirmation are required before quote.",
      item
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function inventorySummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: inventoryService.getInventorySummary(),
    safety: {
      quoteBeforeStockConfirmation: false,
      quoteBeforeCompatibilityConfirmation: false,
      autoSendWhatsApp: false
    }
  });
}

module.exports = {
  inventoryPageController,
  listInventoryController,
  createInventoryController,
  inventorySummaryController
};
