const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const upstream = require(
  getDefaultConfig(path.join(__dirname)).transformer.babelTransformerPath
);

module.exports.transform = function transform({ src, filename, options }) {
  if (filename.endsWith(".md") || filename.endsWith(".prompt")) {
    return upstream.transform({
      src: `export default ${JSON.stringify(src)};`,
      filename: `${filename}.ts`,
      options,
    });
  }
  return upstream.transform({ src, filename, options });
};
