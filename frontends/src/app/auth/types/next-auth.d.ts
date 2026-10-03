import { DefaultSession, DefaultUser } from "next-auth";


declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role: string;
    token: string; 
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      token: string;
    } & DefaultSession["user"]; 
  }
}
