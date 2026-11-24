"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pinMessage } from "@/lib/pin-limit";

interface ClassInfo {
  joinCode: string;
  periodName: string;
  teacherName: string;
  students: { id: string; displayName: string }[];
}

async function fetchClass(code: string): Promise<ClassInfo | null> {
  try {
    const res = await fetch(`/api/public/classes/${encodeURIComponent(code.trim())}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export function StudentLoginForm({
  nextPath,
  initialCode,
}: {
  nextPath: string;
  initialCode?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [student, setStudent] = useState<{ id: string; displayName: string } | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  // A code in the URL is looked up on mount, so start out loading
  const [loading, setLoading] = useState(!!initialCode);

  const showResult = useCallback((info: ClassInfo | null) => {
    setLoading(false);
    if (info) {
      setClassInfo(info);
    } else {
      setError("We couldn't find a class with that code. Check with your teacher.");
    }
  }, []);

  function lookUp(value: string) {
    setError("");
    setLoading(true);
    fetchClass(value).then(showResult);
  }

  useEffect(() => {
    if (initialCode) fetchClass(initialCode).then(showResult);
  }, [initialCode, showResult]);

  async function handleCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim()) lookUp(code);
  }

  async function handlePin(e: React.FormEvent) {
    e.preventDefault();
    if (!classInfo || !student) return;
    setError("");
    setLoading(true);
    const result = await signIn("student", {
      joinCode: classInfo.joinCode,
      studentId: student.id,
      pin,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError(pinMessage(result.code));
      setPin("");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  function startOver() {
    setClassInfo(null);
    setStudent(null);
    setPin("");
    setError("");
  }

  let title = "Student sign in";
  let description = "Enter the class code from your teacher";
  if (classInfo && !student) {
    title = "Who are you?";
    description = `${classInfo.periodName} · ${classInfo.teacherName}`;
  } else if (classInfo && student) {
    title = `Hi, ${student.displayName}`;
    description = "Enter your 4-digit PIN";
  }

  return (
    <div className="auth-screen px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">SignalSlate</h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}

            {!classInfo && (
              <form onSubmit={handleCode} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Class code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DEMO42"
                    autoComplete="off"
                    autoCapitalize="characters"
                    className="font-mono tracking-widest text-lg"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
                  {loading ? "Looking…" : "Next"}
                </Button>
              </form>
            )}

            {classInfo && !student && (
              <>
                {classInfo.students.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    This class has no students yet. Ask your teacher to add you.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {classInfo.students.map((s) => (
                      <Button
                        key={s.id}
                        variant="outline"
                        className="justify-start h-10"
                        onClick={() => {
                          setStudent(s);
                          setError("");
                        }}
                      >
                        {s.displayName}
                      </Button>
                    ))}
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full" onClick={startOver}>
                  Use a different class code
                </Button>
              </>
            )}

            {classInfo && student && (
              <form onSubmit={handlePin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pin">PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="font-mono tracking-[0.5em] text-lg text-center"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || pin.length !== 4}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setStudent(null);
                    setPin("");
                    setError("");
                  }}
                >
                  That&apos;s not me
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500">
          Teacher?{" "}
          <Link href="/login" className="text-slate-900 font-medium hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
