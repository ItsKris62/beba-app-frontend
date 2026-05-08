"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { useAuth, isAdmin } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, user } = useAuth()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [identifier, setIdentifier] = React.useState("")
  const [password, setPassword] = React.useState("")

  // Redirect already-authenticated users who land on this page
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.mustChangePassword) {
        window.location.href = "/change-password"
      } else if (isAdmin(user.role)) {
        window.location.href = "/admin/dashboard"
      } else {
        window.location.href = "/member/dashboard"
      }
    }
  }, [isLoading, isAuthenticated, user])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!identifier || !password) {
      toast.error("Please enter your email or phone and password")
      return
    }
    setIsSubmitting(true)
    try {
      const result = await login(identifier, password)
      if (!result.success || !result.user) {
        toast.error(result.error ?? "Invalid credentials. Please try again.")
        return
      }
      toast.success("Welcome back!")
      if (result.user.mustChangePassword) {
        window.location.href = "/change-password"
      } else if (isAdmin(result.user.role)) {
        window.location.href = "/admin/dashboard"
      } else {
        window.location.href = "/member/dashboard"
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 py-16">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center">
              <span className="text-2xl font-bold text-primary">KC Boda</span>
              <span className="text-2xl font-light text-muted-foreground">|Sacco</span>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Secure access to your accounts
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email Address or Phone</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="you@example.com or +2547..."
                      className="pl-9"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-9 pr-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm font-normal">
                    Remember me on this device
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in…" : "Sign In"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Not a member yet?{" "}
                  <Link href="/membership" className="text-primary hover:underline">
                    Register here
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>

          {/* Security Notice */}
          <div className="mt-6 rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Your security matters</p>
                <p className="text-muted-foreground">
                  We use industry-standard encryption to protect your data. Never share your password with anyone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
