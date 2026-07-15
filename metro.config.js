const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("md", "prompt");
config.transformer.babelTransformerPath = path.join(
  __dirname,
  "metro-string-transformer.js"
);

module.exports = config;
