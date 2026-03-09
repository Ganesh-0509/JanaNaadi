import { createContext, useContext, useState, ReactNode } from 'react';

interface Filters {
  timeRange: string; // '24h' | '7d' | '30d' | 'custom'
  topic: string | null;
  source: string | null;
  language: string | null;
  sentiment: string | null;
}

interface FilterContextType {
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
}

const defaultFilters: Filters = {
  timeRange: '7d',
  topic: null,
  source: null,
  language: null,
  sentiment: null,
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(defaultFilters);

  const setFilters = (partial: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  };

  const resetFilters = () => setFiltersState(defaultFilters);

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
