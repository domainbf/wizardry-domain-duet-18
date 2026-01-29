import { useState, useEffect } from 'react';

const STORAGE_KEY = 'rdap-recent-queries';
const MAX_QUERIES = 10;

export const useRecentQueries = () => {
  const [queries, setQueries] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setQueries(JSON.parse(stored));
      } catch {
        setQueries([]);
      }
    }
  }, []);

  const addQuery = (domain: string) => {
    const normalized = domain.toLowerCase().trim();
    setQueries(prev => {
      const filtered = prev.filter(q => q !== normalized);
      const updated = [normalized, ...filtered].slice(0, MAX_QUERIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearQueries = () => {
    setQueries([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { queries, addQuery, clearQueries };
};
