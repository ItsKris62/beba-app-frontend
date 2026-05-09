"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { adminApi, formatCurrency, type GuarantorRecord } from "@/lib/api-client"

export function AdminOverridePanel({ loanId, guarantors, onUpdated }: { loanId: string; guarantors: GuarantorRecord[]; onUpdated: () => void }) {
  const [reasons, setReasons] = React.useState<Record<string, string>>({})
  const override = useMutation({
    mutationFn: ({ guarantorId, action }: { guarantorId: string; action: "ACCEPT" | "DECLINE" }) =>
      adminApi.overrideGuarantor(loanId, guarantorId, action, reasons[guarantorId] ?? ""),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error?.message ?? "Override failed"); return }
      toast.success("Guarantor override recorded in audit trail.")
      onUpdated()
    },
    onError: () => toast.error("Network error during override."),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Guarantor Status</h2><Link className="text-sm text-primary underline" href="/admin/audit-log?action=GUARANTOR.ADMIN_OVERRIDE">Audit trail</Link></div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Override</TableHead></TableRow></TableHeader>
          <TableBody>
            {guarantors.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{g.member?.memberNumber ?? g.memberId}<p className="text-xs text-muted-foreground">{g.member?.user.firstName} {g.member?.user.lastName}</p></TableCell>
                <TableCell><Badge variant={g.status === "ACCEPTED" ? "default" : g.status === "REJECTED" ? "destructive" : "secondary"}>{g.status}</Badge></TableCell>
                <TableCell className="text-right">{formatCurrency(Number(g.guaranteedAmount))}</TableCell>
                <TableCell><Input placeholder="Required for override" value={reasons[g.id] ?? ""} onChange={(e) => setReasons((prev) => ({ ...prev, [g.id]: e.target.value }))} disabled={g.status !== "PENDING"} /></TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" disabled={g.status !== "PENDING" || !reasons[g.id]?.trim() || override.isPending} onClick={() => override.mutate({ guarantorId: g.id, action: "ACCEPT" })}>Accept</Button><Button size="sm" variant="destructive" disabled={g.status !== "PENDING" || !reasons[g.id]?.trim() || override.isPending} onClick={() => override.mutate({ guarantorId: g.id, action: "DECLINE" })}>Decline</Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}