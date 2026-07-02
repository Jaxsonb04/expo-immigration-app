const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// Bundle the USCIS form template (assets/forms/i-765.pdf) as a static asset so
// expo-asset can resolve it for on-device pdf-lib rendering (issue #9).
config.resolver.assetExts.push("pdf");

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
});
