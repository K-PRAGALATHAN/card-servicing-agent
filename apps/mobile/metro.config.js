// Metro config for a pnpm monorepo (Expo). Watches the workspace root and
// resolves modules from both the app and the hoisted root node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// pnpm uses a nested node_modules layout, so Metro must keep hierarchical
// lookup enabled to resolve transitive deps like @babel/runtime.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
