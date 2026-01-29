import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RecentQueriesProps {
  queries: string[];
  onSelect: (domain: string) => void;
  onClear: () => void;
}

const RecentQueries = ({ queries, onSelect, onClear }: RecentQueriesProps) => {
  if (queries.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">最近查询</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClear}
          className="text-muted-foreground h-auto py-1 px-2"
        >
          清空
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {queries.map((domain, index) => (
          <Badge
            key={index}
            variant="outline"
            className="cursor-pointer hover:bg-accent transition-colors py-1.5 px-3"
            onClick={() => onSelect(domain)}
          >
            {domain}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default RecentQueries;
