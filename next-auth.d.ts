import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      firstname: string;
      lastname: string;
      role: string;
      favorite_team_id?: number;
      favorite_player_id?: number;
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    firstname: string;
    lastname: string;
    role: string;
    favorite_team_id?: number;
    favorite_player_id?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    username: string;
  }
}