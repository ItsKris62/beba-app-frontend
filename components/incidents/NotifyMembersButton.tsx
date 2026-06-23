'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { notifyAffectedMembers } from '@/lib/incidents/client';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

export function NotifyMembersButton({ incidentId, disabled }: { incidentId: string, disabled: boolean }) {
  const [isNotifying, setIsNotifying] = useState(false);

  const handleNotify = async () => {
    setIsNotifying(true);
    try {
      await notifyAffectedMembers(incidentId);
      toast.success("Notifications queued successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to notify members");
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <Button 
      className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
      onClick={handleNotify}
      disabled={disabled || isNotifying}
    >
      <Bell className="h-4 w-4 mr-2" />
      {isNotifying ? "Notifying..." : "Notify All Affected Members"}
    </Button>
  );
}
