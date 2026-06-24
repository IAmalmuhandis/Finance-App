const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Keep Metro scoped to Mobile only — do not crawl the parent monorepo (frontend, ai, backend).
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.blockList = [
  /[\\/]frontend[\\/]/,
  /[\\/]backend[\\/]/,
  /[\\/]ai[\\/]/,
  /[\\/]database[\\/]/,
];
config.maxWorkers = 2;

module.exports = config;
