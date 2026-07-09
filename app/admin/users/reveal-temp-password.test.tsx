import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import AdminUsers from "./page"
import { usersApi, type StaffUser } from "@/lib/api-client"

vi.mock("@/lib/auth-context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-context")>("@/lib/auth-context")
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client")
  return {
    ...actual,
    usersApi: { ...actual.usersApi, list: vi.fn(), revealTemporaryPassword: vi.fn() },
  }
})

import { useAuth } from "@/lib/auth-context"

function makeStaffUser(overrides: Partial<StaffUser> = {}): StaffUser {
  return {
    id: "staff-1",
    email: "teller@example.com",
    firstName: "Sam",
    lastName: "Teller",
    phone: "0712345678",
    role: "TELLER",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    lastLoginAt: null,
    emailVerified: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function mockAuth(role: string) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "admin-1", email: "admin@example.com", firstName: "Ad", lastName: "Min", role, tenantId: "t1", mustChangePassword: false },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    loginWithPin: vi.fn(),
    verifyLoginOtp: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>)
}

async function openRowMenu() {
  const trigger = await screen.findByRole("button", { name: "" })
  fireEvent.pointerDown(trigger)
  fireEvent.click(trigger)
}

describe("Users page — Reveal Temp Password gating and flow", () => {
  beforeEach(() => {
    vi.mocked(usersApi.list).mockReset()
    vi.mocked(usersApi.revealTemporaryPassword).mockReset()
    vi.mocked(usersApi.list).mockResolvedValue({
      success: true,
      data: { data: [makeStaffUser()], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      error: null,
    })
  })

  it("hides the Reveal Temp Password action for a MANAGER (not TENANT_ADMIN)", async () => {
    mockAuth("MANAGER")
    render(<AdminUsers />)
    await screen.findByText("Sam Teller")
    await openRowMenu()
    expect(screen.queryByText("Reveal Temp Password")).not.toBeInTheDocument()
  })

  it("shows the Reveal Temp Password action for a TENANT_ADMIN", async () => {
    mockAuth("TENANT_ADMIN")
    render(<AdminUsers />)
    await screen.findByText("Sam Teller")
    await openRowMenu()
    expect(await screen.findByText("Reveal Temp Password")).toBeInTheDocument()
  })

  it("fetches and displays the temporary password, masked by default, after confirming", async () => {
    mockAuth("TENANT_ADMIN")
    vi.mocked(usersApi.revealTemporaryPassword).mockResolvedValue({
      success: true,
      data: { temporaryPassword: "DMQgdKAKwX4c" },
      error: null,
    })
    render(<AdminUsers />)
    await screen.findByText("Sam Teller")
    await openRowMenu()
    fireEvent.click(await screen.findByText("Reveal Temp Password"))

    fireEvent.click(await screen.findByRole("button", { name: "Reveal" }))
    await waitFor(() => expect(usersApi.revealTemporaryPassword).toHaveBeenCalledWith("staff-1"))

    expect(await screen.findByText("••••••••••••")).toBeInTheDocument()
    expect(screen.queryByText("DMQgdKAKwX4c")).not.toBeInTheDocument()

    fireEvent.click(screen.getByTitle("Show"))
    expect(await screen.findByText("DMQgdKAKwX4c")).toBeInTheDocument()
  })

  it("renders the 'already set their own password' case inline instead of a generic error", async () => {
    mockAuth("TENANT_ADMIN")
    vi.mocked(usersApi.revealTemporaryPassword).mockResolvedValue({
      success: false,
      data: null as unknown as { temporaryPassword: string },
      error: {
        code: "HTTP_400",
        status: 400,
        message: "This user has already logged in and set their own password, so there is no temporary password left to reveal.",
      },
    })
    render(<AdminUsers />)
    await screen.findByText("Sam Teller")
    await openRowMenu()
    fireEvent.click(await screen.findByText("Reveal Temp Password"))

    fireEvent.click(await screen.findByRole("button", { name: "Reveal" }))

    expect(await screen.findByText(/already logged in and set their own password/i)).toBeInTheDocument()
  })
})
