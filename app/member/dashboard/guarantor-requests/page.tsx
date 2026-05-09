"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { GuarantorRequestCard } from "@/components/GuarantorRequestCard"
import { memberApi } from "@/lib/api-client"

export default function GuarantorRequestsPage() {
  const requests = useQuery({
    queryKey: ["guarantor-requests"],
    queryFn: () => memberApi.getGuarantorRequests(),
    refetchInterval: 5000,
  })
  const items = requests.data?.success ? requests.data.data ?? [] : []

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Guarantor Requests</h1><p className="text-muted-foreground">Review loans where you have been nominated as guarantor.</p></div>
      {requests.isLoading ? <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div> : items.length === 0 ? (
        <Card><CardHeader><CardTitle>No pending requests</CardTitle><CardDescription>You do not have any pending guarantor obligations.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Requests will appear here when another member nominates you using your National ID.</CardContent></Card>
      ) : <div className="grid gap-4 lg:grid-cols-2">{items.map((request) => <GuarantorRequestCard key={request.loanId} request={request} onSettled={() => requests.refetch()} />)}</div>}
    </div>
  )
}