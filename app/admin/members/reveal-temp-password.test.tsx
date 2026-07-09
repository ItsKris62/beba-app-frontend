import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import MembersPage from "./page"
import { adminApi, usersApi, type AdminMember } from "@/lib/api-client"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))

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
    adminApi: { ...actual.adminApi, getMembers: vi.fn() },
    usersApi: { ...actual.usersApi, revealTemporaryPassword: vi.fn() },
  }
})

import { useAuth } from "@/lib/auth-context"

function makeMember(overrides: Partial<AdminMember> = {}): AdminMember {
  return {
    id: "member-1",
    memberNumber: "MBR-250558",
    nationalId: "31081907",
    kraPin: null,
    employer: null,
    occupation: null,
    dateOfBirth: null,
    isActive: true,
    joinedAt: "2026-01-01T00:00:00.000Z",
    user: {
      id: "user-1",
      firstName: "Jane",
      lastName: "Wanjiru",
      email: "jane@example.com",
      phone: "0712345678",
      role: "MEMBER",
      accountStatus: "ACTIVE",
      emailVerified: true,
      lastLoginAt: null,
    },
    ...overrides,
  } as AdminMember
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

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MembersPage />
    </QueryClientProvider>,
  )
}

async function openRowMenu() {
  const trigger = await screen.findByRole("button", { name: "" })
  fireEvent.pointerDown(trigger)
  fireEvent.click(trigger)
}

describe("Members page — Reveal Temp Password gating and flow", () => {
  beforeEach(() => {
    vi.mocked(adminApi.getMembers).mockReset()
    vi.mocked(usersApi.revealTemporaryPassword).mockReset()
    vi.mocked(adminApi.getMembers).mockResolvedValue({
      success: true,
      data: { data: [makeMember()], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      error: null,
    })
  })

  it("hides the Reveal Temp Password action for a MANAGER (not TENANT_ADMIN)", async () => {
    mockAuth("MANAGER")
    renderPage()
    await screen.findByText("MBR-250558")
    await openRowMenu()
    expect(screen.queryByText("Reveal Temp Password")).not.toBeInTheDocument()
  })

  it("shows the Reveal Temp Password action for a TENANT_ADMIN", async () => {
    mockAuth("TENANT_ADMIN")
    renderPage()
    await screen.findByText("MBR-250558")
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
    renderPage()
    await screen.findByText("MBR-250558")
    await openRowMenu()
    fireEvent.click(await screen.findByText("Reveal Temp Password"))

    fireEvent.click(await screen.findByRole("button", { name: "Reveal" }))
    await waitFor(() => expect(usersApi.revealTemporaryPassword).toHaveBeenCalledWith("user-1"))

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
    renderPage()
    await screen.findByText("MBR-250558")
    await openRowMenu()
    fireEvent.click(await screen.findByText("Reveal Temp Password"))

    fireEvent.click(await screen.findByRole("button", { name: "Reveal" }))

    expect(await screen.findByText(/already logged in and set their own password/i)).toBeInTheDocument()
  })
})
