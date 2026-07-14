/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint e typecheck rodam como tarefas próprias do workspace.
  eslint: { ignoreDuringBuilds: true },
  // Transpila os pacotes do monorepo consumidos a partir do source.
  transpilePackages: ["@grinta/api-client", "@grinta/design-system"],
  // Resolve imports NodeNext (`./x.js`) dos pacotes-source para `.ts`.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
