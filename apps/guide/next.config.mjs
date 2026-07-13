/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — gera um site 100% estático (dist em ./out), sem servidor Node,
  // atendendo à especificação de distribuição do guia (site público, PWA, offline, zip).
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // A validação TypeScript do guia roda como tarefa própria no workspace.
  // O lint raiz é deliberadamente restrito ao backend nesta primeira fatia.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
