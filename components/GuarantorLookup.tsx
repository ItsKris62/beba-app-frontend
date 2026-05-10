"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { AlertTriangle, Search, Trash2, UserCheck } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency, memberApi, type GuarantorLookupResult } from "@/lib/api-client"

export interface SelectedGuarantor {
  memberId: string
  maskedName: string
  maskedMemberNumber?: string
}

const ERROR_BANNERS: Record<string, string> = {
  SELF_GUARANTEE_NOT_ALLOWED: "You cannot guarantee your own loan.",
  GUARANTOR_KYC_NOT_VERIFIED: "This member has not completed KYC verification.",
  GUARANTOR_INSUFFICIENT_FUNDS: "This member has insufficient available balance for the required hold.",
  GUARANTOR_NOT_FOUND: "No active SACCO member was found.",
  INVALID_ID_NUMBER: "Enter a valid Kenyan National ID with 7-8 digits.",
  INVALID_SEARCH_QUERY: "Search by 7-8 digit National ID or at least 3 characters of a member name.",
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
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<GuarantorLookupResult[]>([])
  const perGuarantorRequired = minGuarantors > 0 ? requiredAmount / minGuarantors : 0
  const remaining = Math.max(0, minGuarantors - guarantors.length)
  const maxReached = Boolean(maxGuarantors && guarantors.length >= maxGuarantors)
  const normalizedQuery = query.trim()
  const canSearch = /^[0-9]{7,8}$/.test(normalizedQuery) || normalizedQuery.length >= 3

  const lookup = useMutation({
    mutationFn: () => memberApi.searchGuarantors(normalizedQuery, perGuarantorRequired, loanProductId),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(mapGuarantorError(res.error?.message))
        setResults([])
        return
      }
      setResults(res.data ?? [])
      if ((res.data ?? []).length === 0) {
        toast.info("No matching eligible member found.")
      }
    },
    onError: () => toast.error("Network error during guarantor lookup."),
  })

  React.useEffect(() => {
    if (!canSearch) {
      setResults([])
      return
    }
    const handle = window.setTimeout(() => lookup.mutate(), 600)
    return () => window.clearTimeout(handle)
  }, [canSearch, normalizedQuery])

  const add = (result: GuarantorLookupResult) => {
    if (!result.eligible) return
    if (maxReached) {
      toast.error(`You can select at most ${maxGuarantors} guarantor(s) for this product.`)
      return
    }
    if (guarantors.some((item) => item.memberId === result.memberId)) {
      toast.error("This guarantor is already selected.")
      return
    }
    onAdd({
      memberId: result.memberId,
      maskedName: result.maskedName,
      maskedMemberNumber: result.maskedMemberNumber,
    })
    setQuery("")
    setResults([])
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="guarantor-search">Guarantor Name or National ID</Label>
        <div className="flex gap-2">
          <Input
            id="guarantor-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or 12345678"
            maxLength={80}
          />
          <Button type="button" variant="outline" onClick={() => lookup.mutate()} disabled={lookup.isPending || !canSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Results are limited to active approved SACCO members and are masked for privacy.
        </p>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <Alert key={result.memberId} variant={result.eligible ? "default" : "destructive"}>
              {result.eligible ? <UserCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{result.eligible ? "Eligible guarantor found" : "Guarantor not eligible"}</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>
                  {result.maskedName}
                  {result.maskedMemberNumber ? ` - ${result.maskedMemberNumber}` : ""}
                  {" - "}{result.kycStatus}
                  {result.reason ? ` - ${mapGuarantorError(result.reason)}` : ""}
                </span>
                {result.eligible && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => add(result)}
                    disabled={maxReached}
                    title={maxReached ? `Maximum ${maxGuarantors} guarantors selected` : "Add guarantor"}
                  >
                    Add
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">Selected guarantors</p>
          <Badge variant={remaining === 0 ? "default" : "secondary"}>
            {maxReached ? `Maximum ${maxGuarantors} selected` : remaining === 0 ? "Minimum met" : `You need ${remaining} more`}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Required coverage: {formatCurrency(requiredAmount)}. Estimated hold per guarantor: {formatCurrency(perGuarantorRequired)}.
        </p>
        <div className="mt-3 space-y-2">
          {guarantors.map((item) => (
            <div key={item.memberId} className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm">
              <span>{item.maskedName}</span>
              {item.maskedMemberNumber && <span className="text-xs text-muted-foreground">{item.maskedMemberNumber}</span>}
              <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(item.memberId)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {guarantors.length === 0 && <p className="py-3 text-sm text-muted-foreground">No guarantors selected.</p>}
        </div>
      </div>
    </div>
  )
}
