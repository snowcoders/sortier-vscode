const configs = require("@snowcoders/renovate-config");

const { buildEslintConfig } = configs;

module.exports = buildEslintConfig({
  esm: false,
  prettier: true,
  typescript: true,
});
