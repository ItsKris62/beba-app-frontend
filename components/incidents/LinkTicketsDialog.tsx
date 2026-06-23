'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Check, Link as LinkIcon } from 'lucide-react';
import { searchActiveTickets, linkTicketsToIncident } from '@/lib/incidents/client';
import { searchActiveTickets as searchSupportTickets } from '@/lib/support/client';
import { AdminSupportTicket } from '@/lib/support/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function LinkTicketsDialog({ incidentId }: { incidentId: string }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const router = useRouter();

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const data = await searchSupportTickets(searchQuery);
      setTickets(data.items || []);
    } catch (e) {
      toast.error('Failed to search tickets');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleLink = async () => {
    if (selectedIds.size === 0) return;
    
    setIsLinking(true);
    try {
      await linkTicketsToIncident(incidentId, Array.from(selectedIds));
      toast.success(`${selectedIds.size} tickets linked successfully`);
      setOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to link tickets');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add / Link Tickets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Support Tickets</DialogTitle>
          <DialogDescription>
            Search for open or in-progress tickets to associate with this incident.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex space-x-2">
            <Input 
              placeholder="Search by subject or member..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching} variant="secondary">
              {isSearching ? <Search className="h-4 w-4 animate-pulse" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-2">
            {tickets.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">
                {isSearching ? 'Searching...' : 'Search for tickets to display results'}
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(ticket.id) ? 'bg-primary/5 border-primary/30' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => toggleSelect(ticket.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        #{ticket.id.slice(0, 8).toUpperCase()} • {ticket.member.firstName} {ticket.member.lastName}
                      </p>
                    </div>
                    {selectedIds.has(ticket.id) && (
                      <Check className="h-5 w-5 text-primary ml-2 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <div className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleLink} disabled={selectedIds.size === 0 || isLinking}>
              <LinkIcon className="h-4 w-4 mr-2" />
              {isLinking ? 'Linking...' : 'Link Tickets'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
