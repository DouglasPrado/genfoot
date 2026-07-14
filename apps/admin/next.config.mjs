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
  // Proxy same-origin para a API oficial — elimina CORS no browser. O cliente
  // chama /api/v1/* na própria origem e o Next reescreve para a API.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET ?? "http://localhost:3000";
    return [{ source: "/api/v1/:path*", destination: `${target}/api/v1/:path*` }];
  },
};

export default nextConfig;
