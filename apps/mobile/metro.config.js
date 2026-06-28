const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the whole workspace and resolve both local and hoisted deps.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Resolve the shared package even if the workspace symlink isn't present.
config.resolver.extraNodeModules = {
  "@immigration/shared": path.resolve(workspaceRoot, "packages/shared"),
};

// Bundle the official I-765 PDF as a static asset for on-device filling.
config.resolver.assetExts.push("pdf");

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
});
