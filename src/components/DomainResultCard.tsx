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
  // Client statuses
  'client delete prohibited': '客户端删除禁止',
  'client transfer prohibited': '客户端转移禁止', 
  'client update prohibited': '客户端更新禁止',
  'client hold': '客户端暂停',
  'client renew prohibited': '客户端续费禁止',
  'clientdeleteprohibited': '客户端删除禁止',
  'clienttransferprohibited': '客户端转移禁止',
  'clientupdateprohibited': '客户端更新禁止',
  'clienthold': '客户端暂停',
  'clientrenewprohibited': '客户端续费禁止',
  // Server statuses
  'server delete prohibited': '服务器删除禁止',
  'server transfer prohibited': '服务器转移禁止',
  'server update prohibited': '服务器更新禁止',
  'server hold': '服务器暂停',
  'server renew prohibited': '服务器续费禁止',
  'serverdeleteprohibited': '服务器删除禁止',
  'servertransferprohibited': '服务器转移禁止',
  'serverupdateprohibited': '服务器更新禁止',
  'serverhold': '服务器暂停',
  'serverrenewprohibited': '服务器续费禁止',
  // Other statuses
  'ok': '正常',
  'active': '激活',
  'actif': '激活',        // 法语
  'activo': '激活',       // 西班牙语
  'ativo': '激活',        // 葡萄牙语
  'inactive': '未激活',
  'inactif': '未激活',    // 法语
  'pending delete': '待删除',
  'pending transfer': '待转移',
  'pending update': '待更新',
  'pending create': '待创建',
  'pending renew': '待续费',
  'redemption period': '赎回期',
  'auto renew period': '自动续费期',
  'transfer period': '转移期',
  'add period': '添加期',
  'renew period': '续费期',
  // Additional common statuses
  'connected': '已连接',
  'registered': '已注册',
  'available': '可用',
  'locked': '已锁定',
  'unlocked': '已解锁',
  'pending verification': '待验证',
  'verified': '已验证',
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
    // Remove URLs and extra spaces, convert to lowercase
    const cleaned = status.toLowerCase().replace(/https?:\/\/[^\s]+/g, '').trim();
    // Try exact match first
    if (STATUS_MAPPING[cleaned]) return STATUS_MAPPING[cleaned];
    // Try without spaces
    const noSpaces = cleaned.replace(/\s+/g, '');
    if (STATUS_MAPPING[noSpaces]) return STATUS_MAPPING[noSpaces];
    // Try original status
    if (STATUS_MAPPING[status]) return STATUS_MAPPING[status];
    // Extract the last part after slash if exists
    const lastPart = status.split('/').pop()?.trim() || status;
    const lastPartLower = lastPart.toLowerCase();
    if (STATUS_MAPPING[lastPartLower]) return STATUS_MAPPING[lastPartLower];
    const lastPartNoSpaces = lastPartLower.replace(/\s+/g, '');
    if (STATUS_MAPPING[lastPartNoSpaces]) return STATUS_MAPPING[lastPartNoSpaces];
    return lastPart;
  };

  return (
    <Card className="border">
      <CardContent className="p-0">
        <Tabs defaultValue="overview" className="w-full">
          {/* Header with domain name */}
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold uppercase break-all">{data.domain}</h2>
          </div>

          <TabsContent value="overview" className="p-6 space-y-6 mt-0">
            {/* Domain Info with tabs on right */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Info className="h-4 w-4" />
                  域名信息
                </h3>
                <div className="flex items-center gap-2">
                  <TabsList className="bg-transparent p-0 h-auto gap-1">
                    <TabsTrigger 
                      value="overview" 
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-xs"
                    >
                      概览
                    </TabsTrigger>
                    <TabsTrigger 
                      value="raw" 
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-xs"
                    >
                      原始数据
                    </TabsTrigger>
                  </TabsList>
                  <Badge variant="default" className="text-xs">
                    {data.source === 'primary' ? 'RDAP' : 'WHOIS'}
                  </Badge>
                </div>
              </div>
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
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-muted-foreground text-sm flex-shrink-0">NS{index + 1}:</span>
                        <span className="text-sm font-mono truncate">{ns}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(ns)}
                        className="h-8 flex-shrink-0"
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
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[500px] font-mono break-all whitespace-pre-wrap">
              {JSON.stringify(rawData || data, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DomainResultCard;
