import { DefaultSession } from "next-auth";
import { GlobalRole, OrganizationRole } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      global_role: GlobalRole;
      organization_role: OrganizationRole;
      tenant_id: string;
      tenant_name: string;
      tenant_slug: string;
      firstname: string;
      lastname: string;
      favorite_team_id: number;
      favorite_player_id: number;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    global_role: GlobalRole;
    organization_role: OrganizationRole;
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    firstname: string;
    lastname: string;
    favorite_team_id: number;
    favorite_player_id: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    global_role: GlobalRole;
    organization_role: OrganizationRole;
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    username: string;
    firstname: string;
    lastname: string;
    favorite_team_id: number;
    favorite_player_id: number;
  }
}