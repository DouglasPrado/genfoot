// Metro config para monorepo pnpm (Expo docs: monorepo setup).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Observa o workspace inteiro (pacotes @grinta/*).
config.watchFolders = [workspaceRoot];

// 2. Resolve módulos a partir do app e da raiz do workspace.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. pnpm usa node_modules isolado/aninhado (deps de um pacote ficam no
// node_modules do próprio pacote via symlink). Mantemos o lookup hierárquico
// ligado para o Metro subir a árvore e achar deps transitivas (ex.
// react-native-helmet-async, dep do expo-router). Desligá-lo quebra o pnpm.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
