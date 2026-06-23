'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateIncidentStatus } from '@/lib/incidents/client';
import { useRouter } from 'next/navigation';

export function IncidentStatusDropdown({ incidentId, currentStatus }: { incidentId: string, currentStatus: string }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateIncidentStatus(incidentId, newStatus);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select 
      value={currentStatus} 
      onValueChange={handleStatusChange}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Update status..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="INVESTIGATING">Investigating</SelectItem>
        <SelectItem value="IDENTIFIED">Identified</SelectItem>
        <SelectItem value="MONITORING">Monitoring</SelectItem>
        <SelectItem value="RESOLVED">Resolved</SelectItem>
      </SelectContent>
    </Select>
  );
}
