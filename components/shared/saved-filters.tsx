'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, Plus, Trash2, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

export interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
}

interface SavedFiltersProps {
  onApplyFilter: (filters: Record<string, any>, name?: string) => void;
  currentFilters?: Record<string, any>;
}

export function SavedFilters({ onApplyFilter, currentFilters }: SavedFiltersProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devtrack_saved_filters');
      if (saved) {
        try { setPresets(JSON.parse(saved)); } catch (e) {}
      } else {
        // Default built-in presets
        const defaults: FilterPreset[] = [
          { id: '1', name: 'My High Priority', filters: { priority: 'high', assignedToMe: true } },
          { id: '2', name: 'In Progress Tasks', filters: { status: 'in_progress' } },
          { id: '3', name: 'Backlog Tasks', filters: { status: 'backlog' } },
        ];
        setPresets(defaults);
        localStorage.setItem('devtrack_saved_filters', JSON.stringify(defaults));
      }
    }
  }, []);

  function saveCurrentPreset() {
    if (!newPresetName.trim()) return;
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      filters: currentFilters || {},
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('devtrack_saved_filters', JSON.stringify(updated));
    }
    setNewPresetName('');
    toast.success(`Filter preset "${newPreset.name}" saved!`);
  }

  function deletePreset(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('devtrack_saved_filters', JSON.stringify(updated));
    }
    toast.info('Preset removed');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
          <Bookmark className="h-3.5 w-3.5 text-amber-500" />
          Saved Views
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 text-xs space-y-3" align="end">
        <div className="font-semibold text-xs border-b pb-1">Filter Presets</div>
        
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {presets.length === 0 ? (
            <p className="text-muted-foreground text-center py-2">No saved views</p>
          ) : (
            presets.map((preset) => (
              <div
                key={preset.id}
                onClick={() => {
                  onApplyFilter(preset.filters, preset.name);
                  setOpen(false);
                }}
                className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors group"
              >
                <span className="font-medium text-foreground truncate">{preset.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500"
                  onClick={(e) => deletePreset(preset.id, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-2 space-y-2">
          <div className="flex gap-1.5">
            <Input
              placeholder="Preset name..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="h-7 text-xs"
            />
            <Button size="sm" onClick={saveCurrentPreset} className="h-7 text-xs px-2 shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
