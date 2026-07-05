const http = require("http");
const config = require("./config/app-config");
const sendJson = require("./utils/send-json");
const routeRequest = require("./routes/index.routes");

const server = http.createServer((req, res) => {
  try {
    routeRequest(req, res, sendJson);
  } catch (error) {
    sendJson(res, 500, {
      error: "Internal server error",
      message: error.message
    });
  }
});

server.listen(config.port, () => {
  console.log(`${config.appName} server running on http://localhost:${config.port}`);
});

module.exports = server;
