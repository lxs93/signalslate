// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudentLoginForm } from "./student-login-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

const classInfo = {
  joinCode: "DEMO42",
  periodName: "Period 2",
  teacherName: "Ms. Rivera",
  students: [{ id: "s1", displayName: "Priya P." }],
};

function mockFetch(ok: boolean) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => classInfo });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StudentLoginForm", () => {
  it("looks up a class code from the URL on load", async () => {
    const fetchMock = mockFetch(true);
    render(<StudentLoginForm nextPath="/student" initialCode="DEMO42" />);
    expect((screen.getByRole("button", { name: "Looking…" }) as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText("Who are you?")).toBeTruthy();
    expect(screen.getByText("Priya P.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/public/classes/DEMO42");
  });

  it("shows an error for an unknown code typed in", async () => {
    mockFetch(false);
    render(<StudentLoginForm nextPath="/student" />);
    fireEvent.change(screen.getByLabelText("Class code"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText(/couldn't find a class/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
