"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, ArrowRight, CheckCircle2, AlertCircle, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { authApi, tokenStore } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"



function TwoFactorSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const { updateUser } = useAuth()

  const [step, setStep] = React.useState<"qr" | "backup">("qr")
  const [loading, setLoading] = React.useState(true)
  const [verifying, setVerifying] = React.useState(false)
  const [secret, setSecret] = React.useState("")
  const [qrCodeUrl, setQrCodeUrl] = React.useState("")
  const [tokenInput, setTokenInput] = React.useState("")
  const [backupCodes, setBackupCodes] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!token) {
      toast.error("Invalid setup token")
      router.replace("/login")
      return
    }

    const generateSecret = async () => {
      try {
        const res = await authApi.generate2FA(token!)
        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? "Failed to generate 2FA secret")
        }
        setSecret(res.data.secret)
        setQrCodeUrl(res.data.qrCodeUrl)
      } catch (err: any) {
        toast.error(err.message)
        router.replace("/login")
      } finally {
        setLoading(false)
      }
    }

    generateSecret()
  }, [token, router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenInput || tokenInput.length !== 6) {
      toast.error("Please enter a valid 6-digit code")
      return
    }
    setVerifying(true)
    try {
      const res = await authApi.verify2FA(token!, secret, tokenInput)
      
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? "Invalid code")
      }

      setBackupCodes(res.data.backupCodes)
      
      // We are now fully authenticated! Save tokens and user.
      tokenStore.set(res.data.accessToken, res.data.refreshToken, res.data.user)
      updateUser(res.data.user)
      
      setStep("backup")
      toast.success("Two-factor authentication enabled successfully!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleFinish = () => {
    router.replace("/") // Or dashboard based on role
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"))
    toast.success("Backup codes copied to clipboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 py-16">
        <div className="w-full max-w-md">
          {step === "qr" ? (
            <Card>
              <CardHeader>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-center">Set up Two-Factor Authentication</CardTitle>
                <CardDescription className="text-center">
                  Your organization requires 2FA to be enabled. Scan the QR code with your authenticator app (like Google Authenticator or Authy).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center rounded-lg bg-white p-4 shadow-sm border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="2FA QR Code" className="h-48 w-48" />
                    </div>
                    
                    <div className="space-y-2 text-center text-sm">
                      <p className="text-muted-foreground">Can&apos;t scan the QR code? Enter this secret manually:</p>
                      <code className="rounded bg-muted px-2 py-1 font-mono">{secret}</code>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Authenticator Code</Label>
                        <Input
                          id="code"
                          type="text"
                          placeholder="000000"
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="text-center text-xl tracking-widest"
                          autoComplete="one-time-code"
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={verifying || tokenInput.length !== 6}>
                        {verifying ? "Verifying..." : "Verify & Enable 2FA"}
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle className="text-center">2FA Enabled Successfully!</CardTitle>
                <CardDescription className="text-center">
                  Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">Important</p>
                      <p>Each backup code can only be used once. We will not show these codes again.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-4 font-mono text-sm">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="text-center tracking-wider">
                      {code}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button variant="outline" className="w-full" onClick={copyToClipboard}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Codes
                </Button>
                <Button className="w-full" onClick={handleFinish}>
                  Continue to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

export default function TwoFactorSetupPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <PublicNavbar />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
        <PublicFooter />
      </div>
    }>
      <TwoFactorSetupContent />
    </React.Suspense>
  )
}
