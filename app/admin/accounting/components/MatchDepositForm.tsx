"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Search, Link2 } from "lucide-react"
import { adminApi, accountingApi, type AdminMember, type UnmatchedMpesaTransaction } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function MatchDepositForm({
  isOpen,
  onClose,
  deposit,
  onMatched,
}: {
  isOpen: boolean
  onClose: () => void
  deposit: UnmatchedMpesaTransaction | null
  onMatched: () => void
}) {
  const [memberSearch, setMemberSearch] = useState("")
  const [members, setMembers] = useState<AdminMember[]>([])
  const [selectedMember, setSelectedMember] = useState("")
  const [memberAccounts, setMemberAccounts] = useState<{ id: string; accountNumber: string; accountType: string; balance: string | number }[]>([])
  const [selectedAccount, setSelectedAccount] = useState("")
  const [matchNote, setMatchNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  useEffect(() => {
    if (deposit?.phoneNumber) {
      setMemberSearch(deposit.phoneNumber)
    }
  }, [deposit])

  useEffect(() => {
    if (!isOpen) return
    const timeout = window.setTimeout(async () => {
      if (!memberSearch) {
        setMembers([])
        return
      }
      const res = await adminApi.getMembers({ search: memberSearch, page: 1, limit: 10, accountStatus: "ACTIVE" })
      if (res.success) setMembers(res.data.data)
      else toast.error(res.error?.message ?? "Failed to search members")
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [isOpen, memberSearch])

  useEffect(() => {
    if (!selectedMember) {
      setMemberAccounts([])
      setSelectedAccount("")
      return
    }

    adminApi.getMember(selectedMember).then((res) => {
      if (res.success) {
        setMemberAccounts(res.data.accounts.filter((account) => account.isActive))
        setSelectedAccount("")
      } else {
        toast.error(res.error?.message ?? "Failed to load member accounts")
      }
    })
  }, [selectedMember])

  async function handleMatch() {
    if (!deposit || !selectedAccount) return
    setIsSubmitting(true)
    const res = await accountingApi.matchMpesa(deposit.id, {
      accountId: selectedAccount,
      note: matchNote || "Matched from accounting dashboard",
    })
    setIsSubmitting(false)
    if (!res.success) {
      toast.error(res.error?.message ?? "Match failed")
      return
    }
    toast.success(`Matched to ${res.data.accountNumber}`)
    setSelectedMember("")
    setSelectedAccount("")
    setMatchNote("")
    onMatched()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Match M-Pesa Deposit</DialogTitle>
          <DialogDescription>
            {deposit ? `${deposit.mpesaReference} - ${formatCurrency(deposit.amount)}` : "Select a member account"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search member by name, ID, or phone..."
              className="pl-8"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
            />
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                className={`w-full rounded-md border p-3 text-left transition-colors ${selectedMember === member.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                onClick={() => setSelectedMember(member.id)}
              >
                <p className="font-medium">{member.user.firstName} {member.user.lastName}</p>
                <p className="text-sm text-muted-foreground">{member.memberNumber} | {member.user.phone ?? "No phone"}</p>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount} disabled={!selectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Select member account" />
              </SelectTrigger>
              <SelectContent>
                {memberAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountType} - {account.accountNumber} ({formatCurrency(Number(account.balance))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea value={matchNote} onChange={(event) => setMatchNote(event.target.value)} placeholder="Optional reconciliation note" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!selectedAccount || isSubmitting} onClick={handleMatch}>
            <Link2 className="mr-2 h-4 w-4" />
            Match Deposit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
