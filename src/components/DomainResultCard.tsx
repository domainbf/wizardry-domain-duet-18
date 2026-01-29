import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Shield, Server, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

// 域名状态中英文映射
const STATUS_MAPPING: Record<string, string> = {
  'client delete prohibited': '客户端删除禁止',
  'client transfer prohibited': '客户端转移禁止', 
  'client update prohibited': '客户端更新禁止',
  'clientDeleteProhibited': '客户端删除禁止',
  'clientTransferProhibited': '客户端转移禁止',
  'clientUpdateProhibited': '客户端更新禁止',
  'serverDeleteProhibited': '服务器删除禁止',
  'serverTransferProhibited': '服务器转移禁止',
  'serverUpdateProhibited': '服务器更新禁止',
  'ok': '正常',
  'active': '激活',
};

interface DomainResultCardProps {
  data: WhoisData;
  rawData?: any;
}

const DomainResultCard = ({ data, rawData }: DomainResultCardProps) => {
  const [copiedNs, setCopiedNs] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNs(text);
      toast({ description: '已复制到剪贴板' });
      setTimeout(() => setCopiedNs(null), 2000);
    } catch {
      toast({ description: '复制失败', variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    // If already in Chinese format (e.g., "2026年05月01日"), return as-is
    if (dateStr.includes('年') && dateStr.includes('月')) {
      return dateStr;
    }
    // Try to parse ISO format dates
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-');
    } catch {
      return dateStr;
    }
  };

  const getStatusChinese = (status: string) => {
    const key = status.toLowerCase().replace(/https?:\/\/[^\s]+/g, '').trim();
    return STATUS_MAPPING[key] || STATUS_MAPPING[status] || status.split('/').pop() || status;
  };

  return (
    <Card className="border">
      <CardContent className="p-0">
        {/* Header with domain and tabs */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <h2 className="text-xl font-bold uppercase">{data.domain}</h2>
          <Badge variant="default" className="text-xs">
            {data.source === 'primary' ? 'RDAP' : 'WHOIS'}
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="px-6 pt-4 border-b">
            <TabsList className="bg-transparent p-0 h-auto gap-2">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 text-sm"
              >
                概览
              </TabsTrigger>
              <TabsTrigger 
                value="raw" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 text-sm"
              >
                原始数据
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-6 space-y-6 mt-0">
            {/* Domain Info */}
            <div>
              <h3 className="section-title">
                <Info className="h-4 w-4" />
                域名信息
              </h3>
              <div className="space-y-2">
                <div className="info-row">
                  <div className="info-row-label">注册商</div>
                  <div className="info-row-value">{data.registrar || 'N/A'}</div>
                </div>
                <div className="info-row">
                  <div className="info-row-label">DNSSEC</div>
                  <div className="info-row-value">{data.dnssec ? '已启用' : '未启用'}</div>
                </div>
                <div className="info-row">
                  <div className="info-row-label">注册时间</div>
                  <div className="info-row-value">{formatDate(data.registrationDate)}</div>
                </div>
                <div className="info-row">
                  <div className="info-row-label">更新时间</div>
                  <div className="info-row-value">{formatDate(data.lastUpdated)}</div>
                </div>
                <div className="info-row">
                  <div className="info-row-label">过期时间</div>
                  <div className="info-row-value">{formatDate(data.expirationDate)}</div>
                </div>
              </div>
            </div>

            {/* Domain Status */}
            {data.status && data.status.length > 0 && (
              <div>
                <h3 className="section-title">
                  <Shield className="h-4 w-4" />
                  域名状态
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.status.map((status, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {getStatusChinese(status)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Name Servers */}
            {data.nameServers && data.nameServers.length > 0 && (
              <div>
                <h3 className="section-title">
                  <Server className="h-4 w-4" />
                  域名服务器
                </h3>
                <div className="space-y-2">
                  {data.nameServers.map((ns, index) => (
                    <div key={index} className="ns-row">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">NS{index + 1}:</span>
                        <span className="text-sm font-mono">{ns}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(ns)}
                        className="h-8"
                      >
                        {copiedNs === ns ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span className="ml-1">复制</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="raw" className="p-6 mt-0">
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[500px] font-mono">
              {JSON.stringify(rawData || data, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DomainResultCard;
