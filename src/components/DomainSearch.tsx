import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DomainSearchProps {
  domain: string;
  setDomain: (domain: string) => void;
  onSearch: () => void;
  loading: boolean;
}

const DomainSearch = ({ domain, setDomain, onSearch, loading }: DomainSearchProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">域名或 IDN</label>
      <div className="flex gap-2">
        <Input
          placeholder="e.g., example.com or münich.de"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !loading && onSearch()}
          className="flex-1 h-11"
          disabled={loading}
        />
        <Button 
          onClick={onSearch}
          disabled={loading}
          className="h-11 px-6"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            '查询'
          )}
        </Button>
      </div>
    </div>
  );
};

export default DomainSearch;
