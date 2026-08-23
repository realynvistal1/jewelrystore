const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

let envLoaded = false;

function loadEnv() {
  if (envLoaded) {
    return;
  }

  const rootEnvPath = path.join(__dirname, "..", "..", ".env");
  const nestedEnvPath = path.join(__dirname, "..", "..", ".env", ".env");

  if (fs.existsSync(rootEnvPath) && fs.statSync(rootEnvPath).isFile()) {
    dotenv.config({ path: rootEnvPath });
  } else if (fs.existsSync(nestedEnvPath) && fs.statSync(nestedEnvPath).isFile()) {
    dotenv.config({ path: nestedEnvPath });
  }

  envLoaded = true;
}

module.exports = {
  loadEnv
};
