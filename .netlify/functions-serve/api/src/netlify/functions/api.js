// netlify/functions/api.js
var express = require("express");
function handler(event, context) {
  const api = express();
  const router = express.Router();
  router.get("/hello", (req, res) => res.send("Hello World!"));
  api.use("/api/", router);
  return serverless(api)(event, context);
}
module.exports = { handler };
//# sourceMappingURL=api.js.map
