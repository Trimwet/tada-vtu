// Metro config for monorepo support.
//
// Without this, Metro can't resolve `@tadapay/shared` even though
// Bun's workspace symlink is correctly in place — Metro only watches
// the mobile/ folder by default and won't follow outside it.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo, not just mobile/, so changes in
// packages/shared/ trigger a rebuild.
config.watchFolders = [workspaceRoot];

// Let Metro resolve modules hoisted to the workspace root's node_modules,
// in addition to mobile/'s own node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
