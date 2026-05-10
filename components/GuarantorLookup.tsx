"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { Search, Trash2, UserCheck, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { memberApi, formatCurrency, type GuarantorLookupResult } from "@/lib/api-client"

export interface SelectedGuarantor {
  memberId: string
  maskedName: string
}

const ERROR_BANNERS: Record<string, string> = {
  SELF_GUARANTEE_NOT_ALLOWED: "You cannot guarantee your own loan.",
  GUARANTOR_KYC_NOT_VERIFIED: "This member has not completed KYC verification.",
  GUARANTOR_INSUFFICIENT_FUNDS: "This member has insufficient available balance for the required hold.",
  GUARANTOR_NOT_FOUND: "No active SACCO member was found for that National ID.",
  INVALID_ID_NUMBER: "Enter a valid Kenyan National ID with 7–8 digits.",
}

export function mapGuarantorError(message?: string) {
  const text = message ?? "Lookup failed. Please try again."
  const code = Object.keys(ERROR_BANNERS).find((key) => text.includes(key))
  return code ? ERROR_BANNERS[code] : text
}

export function GuarantorLookup({
  requiredAmount,
  minGuarantors,
  guarantors,
  onAdd,
  onRemove,
  loanProductId,
  maxGuarantors,
}: {
  requiredAmount: number
  minGuarantors: number
  loanProductId?: string
  maxGuarantors?: number
  guarantors: SelectedGuarantor[]
  onAdd: (guarantor: SelectedGuarantor) => void
  onRemove: (memberId: string) => void
}) {
  const [idNumber, setIdNumber] = React.useState("")
  const [result, setResult] = React.useState<GuarantorLookupResult | null>(null)
  const perGuarantorRequired = minGuarantors > 0 ? requiredAmount / minGuarantors : 0
  const remaining = Math.max(0, minGuarantors - guarantors.length)
  const maxReached = Boolean(maxGuarantors && guarantors.length >= maxGuarantors)
  const lookup = useMutation({
    mutationFn: () => memberApi.lookupGuarantor(idNumber.trim(), perGuarantorRequired, loanProductId),
    onSuccess: (res) => {
      if (!res.success || !res.data) {
        toast.error(mapGuarantorError(res.error?.message))
        setResult(null)
        return
      }
      setResult(res.data)
    },
    onError: () => toast.error("Network error during guarantor lookup."),
  })

  React.useEffect(() => {
    if (!/^[0-9]{7,8}$/.test(idNumber.trim())) return
    const handle = window.setTimeout(() => lookup.mutate(), 600)
    return () => window.clearTimeout(handle)
  }, [idNumber])

  const add = () => {
    if (!result?.eligible) return
    if (maxReached) {
      toast.error(`You can select at most ${maxGuarantors} guarantor(s) for this product.`)
      return
    }
    if (guarantors.some((item) => item.memberId === result.memberId)) {
      toast.error("This guarantor is already selected.")
      return
    }
    onAdd({ memberId: result.memberId, maskedName: result.maskedName })
    setIdNumber("")
    setResult(null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="guarantor-id">Guarantor National ID</Label>
        <div className="flex gap-2">
          <Input id="guarantor-id" value={idNumber} onChange={(e) => setIdNumber(e.target.value.replace(/[^0-9]/g, ""))} placeholder="12345678" maxLength={8} />
          <Button type="button" variant="outline" onClick={() => lookup.mutate()} disabled={lookup.isPending || !/^[0-9]{7,8}$/.test(idNumber)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Search uses National ID only. Names/usernames are never searchable.</p>
      </div>

      {result && (
        <Alert variant={result.eligible ? "default" : "destructive"}>
          {result.eligible ? <UserCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{result.eligible ? "Eligible guarantor found" : "Guarantor not eligible"}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{result.maskedName} · {result.kycStatus}{result.reason ? ` · ${mapGuarantorError(result.reason)}` : ""}</span>
            {result.eligible && <Button type="button" size="sm" onClick={add} disabled={maxReached} title={maxReached ? `Maximum ${maxGuarantors} guarantors selected` : "Add guarantor"}>Add</Button>}
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">Selected guarantors</p>
          <Badge variant={remaining === 0 ? "default" : "secondary"}>{maxReached ? `Maximum ${maxGuarantors} selected` : remaining === 0 ? "Minimum met" : `You need ${remaining} more guarantors`}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Required coverage: {formatCurrency(requiredAmount)}. Estimated hold per guarantor: {formatCurrency(perGuarantorRequired)}.</p>
        <div className="mt-3 space-y-2">
          {guarantors.map((item) => (
            <div key={item.memberId} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span>{item.maskedName}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(item.memberId)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {guarantors.length === 0 && <p className="py-3 text-sm text-muted-foreground">No guarantors selected.</p>}
        </div>
      </div>
    </div>
  )
}
