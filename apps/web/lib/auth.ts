import { createServerClient } from "./supabase";
import type { AuthUser } from "@accountant/shared-types";

export async function getAuthUser(
  authHeader: string | null | undefined
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabase = createServerClient();

  try {
    // Verify the token by decoding it (basic JWT decode without verification)
    // In production, use proper JWT validation
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // For testing: try to get user from token
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser(token);

      if (!user) {
        return null;
      }

      // Get user role and company from app_users table
      const { data: appUser, error: userError } = await supabase
        .from("app_users")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (userError || !appUser) {
        return null;
      }

      // Get primary company membership
      const { data: membership, error: memberError } = await supabase
        .from("memberships")
        .select("company_id, branch_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (memberError || !membership) {
        return null;
      }

      return {
        id: user.id,
        role: appUser.role as "admin" | "accountant" | "auditor" | "staff",
        companyId: membership.company_id,
        branchId: membership.branch_id || undefined
      };
    } catch (authError) {
      // Auth verification failed, return null
      console.error("Auth verification error:", authError);
      return null;
    }
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export function requireAuthUser(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
