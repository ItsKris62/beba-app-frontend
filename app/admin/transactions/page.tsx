import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { canViewTransactions } from "@/lib/permissions";
import { normalizeRole } from "@/types/roles";
import AdminTransactionsClient from "./transactions-client";

interface JwtPayload {
  role?: string;
}

function getRoleFromToken(token: string): string | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    return normalizeRole(payload.role);
  } catch {
    return null;
  }
}

export default async function AdminTransactionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("beba_access_token")?.value;

  if (!token) {
    redirect("/login?returnTo=/admin/transactions");
  }

  if (!canViewTransactions(getRoleFromToken(token))) {
    redirect("/403");
  }

  return <AdminTransactionsClient />;
}
