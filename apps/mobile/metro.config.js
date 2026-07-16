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

// 3b. Subpath exports ("./internal" e afins) existem só no mapa `exports` do
// package.json, sem arquivo correspondente no disco. Sem isto o Metro não
// resolve `@clerk/react/internal`, importado por @clerk/expo.
config.resolver.unstable_enablePackageExports = true;

// 3c. Com package exports ligado, a condição `import` faz o Metro escolher o
// build ESM de alguns pacotes — que usa `import.meta`, não suportado pelo
// Hermes ("SyntaxError: 'import.meta' is currently unsupported"). Fixamos as
// condições sem `import` para cair no build CJS.
config.resolver.unstable_conditionNames = ["require", "react-native", "default"];

// 4. React tem que ser UMA cópia só no bundle. Como o nodeModulesPaths inclui a
// raiz do workspace (onde vivem react@19 + react-dom@19 do admin/guide), sem
// isto algum `react` resolve lá em vez do React 18 do app — duas cópias = dois
// `$$typeof`, e o RN quebra com "Objects are not valid as a React child".
// Fixamos react/react-dom (e subpaths, ex. react/jsx-runtime) na cópia local.
// NÃO incluir `react-native`: só existe no app (não duplica) e no web o Expo
// precisa aliasá-lo para react-native-web por plataforma — pinar quebraria.
const SINGLETONS = ["react", "react-dom"];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const pkg of SINGLETONS) {
    if (moduleName === pkg || moduleName.startsWith(`${pkg}/`)) {
      const pinned = path.join(projectRoot, "node_modules", moduleName);
      return context.resolveRequest(context, pinned, platform);
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
