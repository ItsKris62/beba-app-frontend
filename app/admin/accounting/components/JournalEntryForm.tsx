"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Send, XCircle } from "lucide-react"
import { accountingApi, type GLAccount } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function JournalEntryForm({
  isOpen,
  onClose,
  accounts,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  accounts: GLAccount[]
  onCreated: () => void
}) {
  const [journalDebitAccount, setJournalDebitAccount] = useState("")
  const [journalCreditAccount, setJournalCreditAccount] = useState("")
  const [journalDebitAmount, setJournalDebitAmount] = useState("")
  const [journalCreditAmount, setJournalCreditAmount] = useState("")
  const [journalDescription, setJournalDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const isBalanced = Number(journalDebitAmount) > 0 && journalDebitAmount === journalCreditAmount

  async function createJournalEntry() {
    if (!isBalanced || !journalDescription.trim() || !journalDebitAccount || !journalCreditAccount) return
    setIsSubmitting(true)
    const res = await accountingApi.createJournalEntry({
      description: journalDescription.trim(),
      type: "MANUAL",
      postings: [
        {
          debitAccountId: journalDebitAccount,
          creditAccountId: journalCreditAccount,
          amount: Number(journalDebitAmount),
          description: journalDescription.trim(),
        },
      ],
    })
    setIsSubmitting(false)
    if (!res.success) {
      toast.error(res.error?.message ?? "Could not create journal entry")
      return
    }
    toast.success("Journal entry created")
    setJournalDebitAccount("")
    setJournalCreditAccount("")
    setJournalDebitAmount("")
    setJournalCreditAmount("")
    setJournalDescription("")
    onCreated()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Manual Journal Entry</DialogTitle>
          <DialogDescription>Create a double-entry journal entry. Large entries require maker-checker approval.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Enter journal entry description..." value={journalDescription} onChange={(event) => setJournalDescription(event.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Debit (Dr)</p>
              <Select value={journalDebitAccount} onValueChange={setJournalDebitAccount}>
                <SelectTrigger><SelectValue placeholder="Select GL account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.code} - {account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" min="0" placeholder="0.00" value={journalDebitAmount} onChange={(event) => setJournalDebitAmount(event.target.value)} />
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Credit (Cr)</p>
              <Select value={journalCreditAccount} onValueChange={setJournalCreditAccount}>
                <SelectTrigger><SelectValue placeholder="Select GL account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.code} - {account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" min="0" placeholder="0.00" value={journalCreditAmount} onChange={(event) => setJournalCreditAmount(event.target.value)} />
            </div>
          </div>
          {journalDebitAmount && journalCreditAmount && !isBalanced && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
              <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <XCircle className="h-4 w-4" />
                Debits ({formatCurrency(Number(journalDebitAmount))}) != Credits ({formatCurrency(Number(journalCreditAmount))}).
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!isBalanced || !journalDescription.trim() || !journalDebitAccount || !journalCreditAccount || isSubmitting} onClick={createJournalEntry}>
            <Send className="mr-2 h-4 w-4" />
            Submit Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
