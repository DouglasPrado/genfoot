import { SetMetadata } from "@nestjs/common";

export const PUBLIC_KEY = "grinta:public";

/** Marca uma rota como pública (sem exigir Bearer token). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const REQUIRED_ROLE_KEY = "grinta:requiredRole";

/** Exige um papel específico (RBAC) na rota. */
export const RequireRole = (role: "user" | "admin") =>
  SetMetadata(REQUIRED_ROLE_KEY, role);
