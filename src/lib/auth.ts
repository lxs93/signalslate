import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { normalizeJoinCode } from "@/lib/codes";
import { normalizeEmail } from "@/lib/validations";
import { PIN_TRIES_BEFORE_LOCK, afterWrongPin, pinBlock, type PinBlock } from "@/lib/pin-limit";

/** Tells the sign-in form why a student can't try a PIN (result.code on the client). */
class PinBlocked extends CredentialsSignin {
  constructor(block: PinBlock) {
    super();
    this.code = `pin_${block}`;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Case-insensitive, so "Ana@School.org" and "ana@school.org" are the same teacher
        const user = await db.user.findFirst({
          where: { email: { equals: normalizeEmail(String(credentials.email)), mode: "insensitive" } },
        });
        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!passwordMatch) return null;

        return { id: user.id, email: user.email, name: user.name, role: "teacher" };
      },
    }),
    // Students sign in with their class code, pick their name, and enter a PIN
    Credentials({
      id: "student",
      name: "student",
      credentials: {
        joinCode: { label: "Class code", type: "text" },
        studentId: { label: "Student", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const joinCode = normalizeJoinCode(String(credentials?.joinCode ?? ""));
        const studentId = String(credentials?.studentId ?? "");
        const pin = String(credentials?.pin ?? "");
        if (!joinCode || !studentId || !pin) return null;

        const enrollment = await db.enrollment
          .findFirst({
            where: { studentId, period: { joinCode } },
            include: { student: true },
          })
          .catch(() => null);
        if (!enrollment) return null;
        const { student } = enrollment;

        const block = pinBlock(student);
        if (block) throw new PinBlocked(block);

        // Count the attempt before comparing, in one statement, so guesses sent
        // at the same moment can't get past the limit
        const counted = await db.$queryRaw<{ failed_pin_attempts: number }[]>`
          UPDATE "students" SET "failed_pin_attempts" = "failed_pin_attempts" + 1
          WHERE "id" = ${student.id}::uuid AND "failed_pin_attempts" < ${PIN_TRIES_BEFORE_LOCK}
          RETURNING "failed_pin_attempts"`;
        if (counted.length === 0) throw new PinBlocked("locked");

        if (student.pin !== pin) {
          const after = afterWrongPin(counted[0].failed_pin_attempts);
          if (after.lockUntil) {
            await db.student.update({ where: { id: student.id }, data: { pinLockedUntil: after.lockUntil } });
          }
          if (after.block) throw new PinBlocked(after.block);
          return null;
        }

        await db.student.update({ where: { id: student.id }, data: { failedPinAttempts: 0, pinLockedUntil: null } });
        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          role: "student",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Teachers get token.id; students get token.studentId and never token.id,
        // so every teacher route that checks session.user.id rejects students.
        if (user.role === "student") {
          token.role = "student";
          token.studentId = user.id;
        } else {
          token.role = "teacher";
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const role = token.role ?? (token.id ? "teacher" : undefined);
        session.user.role = role as "teacher" | "student" | undefined;
        if (role === "teacher" && token.id) {
          session.user.id = token.id as string;
        }
        if (role === "student" && token.studentId) {
          session.user.studentId = token.studentId as string;
          // Clear the default id so student sessions never look like teachers
          session.user.id = undefined as unknown as string;
        }
      }
      return session;
    },
  },
});
