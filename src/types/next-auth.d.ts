import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "teacher" | "student";
      /** Set only for student sessions */
      studentId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "teacher" | "student";
  }
}
