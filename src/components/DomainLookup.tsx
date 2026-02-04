import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DomainSearch from './DomainSearch';
import DomainResultCard from './DomainResultCard';
import PricingInfo from './PricingInfo';
import RecentQueries from './RecentQueries';
import { useRecentQueries } from '@/hooks/useRecentQueries';
import { useDomainPricing } from '@/hooks/useDomainPricing';

interface WhoisData {
  domain: string;
  registrar: string;
  registrationDate: string;
  expirationDate: string;
  nameServers: string[];
  status: string[];
  registrant?: {
    name?: string;
    organization?: string;
    country?: string;
    email?: string;
  };
  dnssec: boolean;
  lastUpdated: string;
  source: 'primary' | 'secondary';
}

const DomainLookup = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ primary?: WhoisData; rawData?: any } | null>(null);
  const [error, setError] = useState<string>('');
  
  const { queries, addQuery, clearQueries } = useRecentQueries();
  const { pricing, loading: pricingLoading, fetchPricing, clearPricing } = useDomainPricing();

  const mergeResults = (data: any): { result: WhoisData | null; rawData: any } => {
    const primary = data.primary;
    const secondary = data.secondary;
    
    if (!primary && !secondary) return { result: null, rawData: data };
    
    const baseData = primary || secondary;
    const supplementData = primary ? secondary : primary;
    
    const result: WhoisData = {
      domain: baseData.domain,
      registrar: baseData.registrar || supplementData?.registrar || 'N/A',
      registrationDate: baseData.registrationDate || supplementData?.registrationDate || 'N/A',
      expirationDate: baseData.expirationDate || supplementData?.expirationDate || 'N/A',
      lastUpdated: baseData.lastUpdated || supplementData?.lastUpdated || 'N/A',
      nameServers: baseData.nameServers?.length ? baseData.nameServers : (supplementData?.nameServers || []),
      status: baseData.status?.length ? baseData.status : (supplementData?.status || []),
      registrant: baseData.registrant || supplementData?.registrant || {},
      dnssec: baseData.dnssec !== undefined ? baseData.dnssec : (supplementData?.dnssec || false),
      source: (baseData.source === 'rdap' ? 'primary' : 'secondary') as 'primary' | 'secondary'
    };
    
    return { result, rawData: data };
  };

  const performLookup = async (domainName: string) => {
    try {
      const response = await supabase.functions.invoke('domain-lookup', {
        body: { domain: domainName }
      });

      if (response.error) {
        return { error: '查询服务暂时不可用，请稍后重试' };
      }

      const data = response.data;
      
      if (data.error) {
        let specificError = data.error;
        if (data.errorType === 'domain_not_found') {
          specificError = `域名 ${domainName} 未注册，该域名可供注册使用`;
        } else if (data.errorType === 'domain_reserved') {
          specificError = `域名 ${domainName} 为保留域名，不可注册`;
        } else if (data.errorType === 'unsupported_tld') {
          specificError = data.error;
        }
        
        return { error: specificError, errorType: data.errorType };
      }

      const mergedData = mergeResults(data);
      if (mergedData.result) {
        return { primary: mergedData.result, rawData: mergedData.rawData };
      } else {
        return { error: '未找到域名信息' };
      }
    } catch (error) {
      return { error: '网络连接错误，请检查网络后重试' };
    }
  };

  const handleLookup = async (domainToSearch?: string) => {
    const searchDomain = domainToSearch || domain;
    setError('');
    
    if (!searchDomain.trim()) {
      setError('域名不能为空，请输入要查询的域名');
      return;
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(searchDomain.trim())) {
      setError('域名格式无效，请输入有效的域名格式');
      return;
    }

    const normalizedDomain = searchDomain.trim().toLowerCase();
    setLoading(true);
    setResult(null);
    clearPricing();

    try {
      const lookupResult = await performLookup(normalizedDomain);
      setResult(lookupResult);
      
      if (lookupResult.error) {
        setError(lookupResult.error);
      } else {
        addQuery(normalizedDomain);
        // Pass whether domain is registered based on successful lookup
        fetchPricing(normalizedDomain, true);
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRecentSelect = (selectedDomain: string) => {
    setDomain(selectedDomain);
    handleLookup(selectedDomain);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Search */}
      <DomainSearch
        domain={domain}
        setDomain={setDomain}
        onSearch={() => handleLookup()}
        loading={loading}
      />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Pricing */}
      {(pricing || pricingLoading) && (
        <PricingInfo pricing={pricing} loading={pricingLoading} />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Result */}
      {result?.primary && !loading && (
        <DomainResultCard data={result.primary} rawData={result.rawData} />
      )}

      {/* Recent Queries */}
      <RecentQueries
        queries={queries}
        onSelect={handleRecentSelect}
        onClear={clearQueries}
      />

      {/* Partner Badges */}
      <div className="mt-8 pt-6 border-t">
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center justify-center aspect-[3/2] bg-muted/30 rounded-lg p-3">
            <img src="/logo.png" alt="NIC.BN" className="max-h-12 w-auto object-contain" />
          </div>
          <div className="flex items-center justify-center aspect-[3/2] bg-muted/30 rounded-lg p-3">
            <img src="/heise.png" alt="CHINA.TN" className="max-h-12 w-auto object-contain" />
          </div>
          <div className="flex items-center justify-center aspect-[3/2] bg-muted/30 rounded-lg p-3">
            <img src="/domainbf.png" alt="DOMAIN.BF" className="max-h-12 w-auto object-contain" />
          </div>
          <div className="flex items-center justify-center aspect-[3/2] bg-muted/30 rounded-lg p-3">
            <img src="/x.rw.png" alt="X.RW" className="max-h-12 w-auto object-contain" />
          </div>
        </div>
      </div>

      {/* Copyright Footer */}
      <footer className="mt-8 pt-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          © 2026 不讲·李. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default DomainLookup;
