const dataStore = require("../services/data-store");

function storageStatusController(req, res, sendJson) {
  dataStore.ensureDataDir();

  sendJson(res, 200, {
    status: "ok",
    message: "Basic JSON data storage foundation is working.",
    collections: Object.keys(dataStore.collections),
    counts: dataStore.countAll()
  });
}

module.exports = storageStatusController;
