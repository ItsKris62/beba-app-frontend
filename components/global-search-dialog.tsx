'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Building2,
  Calculator,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  Settings,
  Shield,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  getFilteredSearchItems,
  type SearchCategory,
  type SearchItem,
} from '@/lib/search/search-registry';
import {
  matchesSearchQuery,
  sanitizeSearchQuery,
} from '@/lib/search/search-security';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardList,
  MapPin,
  UserCheck,
  CreditCard,
  Package,
  Calculator,
  ArrowLeftRight,
  MessageSquare,
  Upload,
  BarChart3,
  Activity,
  Settings,
  Building2,
  Wallet,
  FileText,
  User,
  Shield,
};

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
  userType: 'member' | 'admin';
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
  userRole,
  userType,
}: GlobalSearchDialogProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = React.useState('');

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setQuery('');
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Global shortcut handler (Cmd+K or Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleOpenChange(!open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleOpenChange]);

  // Sanitized query and role-filtered search items
  const sanitizedQuery = React.useMemo(() => sanitizeSearchQuery(query), [query]);

  const availableItems = React.useMemo(
    () => getFilteredSearchItems(userRole, userType),
    [userRole, userType]
  );

  const matchedItems = React.useMemo(() => {
    return availableItems.filter((item) =>
      matchesSearchQuery(sanitizedQuery, {
        title: item.title,
        description: item.description,
        category: item.category,
        keywords: item.keywords,
      })
    );
  }, [availableItems, sanitizedQuery]);

  // Group matched items by category
  const groupedItems = React.useMemo(() => {
    const groups: Record<SearchCategory, SearchItem[]> = {
      Navigation: [],
      Settings: [],
      Functions: [],
      'Quick Actions': [],
    };

    matchedItems.forEach((item) => {
      if (groups[item.category]) {
        groups[item.category].push(item);
      }
    });

    return groups;
  }, [matchedItems]);

  const handleSelect = (item: SearchItem) => {
    handleOpenChange(false);

    if (item.actionType === 'toggle-theme') {
      setTheme(theme === 'light' ? 'dark' : 'light');
      return;
    }

    if (item.href && item.href !== '#') {
      router.push(item.href);
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Portal Search & Quick Actions"
      description="Search for settings, functions, pages, and quick system commands..."
    >
      <CommandInput
        placeholder="Type a setting or function... (e.g. password, loans, kyc, theme)"
        value={query}
        onValueChange={setQuery}
        maxLength={80}
      />

      <CommandList className="max-h-95 p-2">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          {sanitizedQuery ? (
            <span>
              No settings or functions matching &quot;<span className="font-medium text-foreground">{sanitizedQuery}</span>&quot; for your role.
            </span>
          ) : (
            'No matching portal items available.'
          )}
        </CommandEmpty>

        {(Object.keys(groupedItems) as SearchCategory[]).map((category) => {
          const items = groupedItems[category];
          if (!items || items.length === 0) return null;

          return (
            <CommandGroup key={category} heading={category} className="px-1 py-1.5">
              {items.map((item) => {
                const IconComponent = ICON_MAP[item.icon] || Settings;

                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.description} ${item.keywords.join(' ')}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/70 aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="flex flex-1 flex-col overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{item.title}</span>
                        {item.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </span>
                    </div>

                    <span className="text-[11px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
