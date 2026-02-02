import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Shield, Server, Copy, Check, ExternalLink } from 'lucide-react';
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

// 注册商官网映射
const REGISTRAR_URLS: Record<string, string> = {
  // 主流国际注册商
  'godaddy': 'https://www.godaddy.com',
  'godaddy.com': 'https://www.godaddy.com',
  'godaddy.com, llc': 'https://www.godaddy.com',
  'namecheap': 'https://www.namecheap.com',
  'namecheap, inc.': 'https://www.namecheap.com',
  'cloudflare': 'https://www.cloudflare.com',
  'cloudflare, inc.': 'https://www.cloudflare.com',
  'google': 'https://domains.google',
  'google llc': 'https://domains.google',
  'google domains': 'https://domains.google',
  'amazon': 'https://aws.amazon.com/route53',
  'amazon registrar': 'https://aws.amazon.com/route53',
  'amazon registrar, inc.': 'https://aws.amazon.com/route53',
  'dynadot': 'https://www.dynadot.com',
  'dynadot, llc': 'https://www.dynadot.com',
  'porkbun': 'https://www.porkbun.com',
  'porkbun llc': 'https://www.porkbun.com',
  'gandi': 'https://www.gandi.net',
  'gandi sas': 'https://www.gandi.net',
  'hover': 'https://www.hover.com',
  'tucows': 'https://www.tucows.com',
  'tucows domains': 'https://www.tucows.com',
  'enom': 'https://www.enom.com',
  'enom, llc': 'https://www.enom.com',
  'name.com': 'https://www.name.com',
  'name.com, inc.': 'https://www.name.com',
  'register.com': 'https://www.register.com',
  'network solutions': 'https://www.networksolutions.com',
  'network solutions, llc': 'https://www.networksolutions.com',
  'markmonitor': 'https://www.markmonitor.com',
  'markmonitor inc.': 'https://www.markmonitor.com',
  'csc corporate domains': 'https://www.cscglobal.com',
  'key-systems': 'https://www.key-systems.net',
  'key-systems gmbh': 'https://www.key-systems.net',
  'ovh': 'https://www.ovh.com',
  'ovh sas': 'https://www.ovh.com',
  'ionos': 'https://www.ionos.com',
  '1&1 ionos': 'https://www.ionos.com',
  'united-domains': 'https://www.united-domains.de',
  'epik': 'https://www.epik.com',
  'epik, inc.': 'https://www.epik.com',
  'njalla': 'https://njal.la',
  'sav.com': 'https://www.sav.com',
  'spaceship': 'https://www.spaceship.com',
  // 中国注册商
  '阿里云': 'https://wanwang.aliyun.com',
  '万网': 'https://wanwang.aliyun.com',
  'alibaba': 'https://wanwang.aliyun.com',
  'alibaba cloud': 'https://wanwang.aliyun.com',
  'hichina': 'https://wanwang.aliyun.com',
  '腾讯云': 'https://dnspod.cloud.tencent.com',
  'dnspod': 'https://www.dnspod.cn',
  '新网': 'https://www.xinnet.com',
  'xinnet': 'https://www.xinnet.com',
  '西部数码': 'https://www.west.cn',
  'west.cn': 'https://www.west.cn',
  '爱名网': 'https://www.22.cn',
  '22.cn': 'https://www.22.cn',
  '易名': 'https://www.ename.net',
  'ename': 'https://www.ename.net',
  '华为云': 'https://www.huaweicloud.com',
  // 其他亚洲注册商
  'onamae': 'https://www.onamae.com',
  'gmo': 'https://www.gmo.jp',
  // 欧洲注册商
  'eurodns': 'https://www.eurodns.com',
  'strato': 'https://www.strato.de',
  'hostinger': 'https://www.hostinger.com',
};

interface DomainResultCardProps {
  data: WhoisData;
  rawData?: any;
}

const DomainResultCard = ({ data, rawData }: DomainResultCardProps) => {
  const [copiedNs, setCopiedNs] = useState<string | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, type: 'ns' | 'raw' = 'ns') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'raw') {
        setCopiedRaw(true);
        toast({ description: '原始数据已复制到剪贴板' });
        setTimeout(() => setCopiedRaw(false), 2000);
      } else {
        setCopiedNs(text);
        toast({ description: '已复制到剪贴板' });
        setTimeout(() => setCopiedNs(null), 2000);
      }
    } catch {
      toast({ description: '复制失败', variant: 'destructive' });
    }
  };

  const getRegistrarUrl = (registrar: string): string | null => {
    if (!registrar || registrar === 'N/A' || registrar === 'Unknown') return null;
    
    const registrarLower = registrar.toLowerCase().trim();
    
    // 直接匹配
    if (REGISTRAR_URLS[registrarLower]) {
      return REGISTRAR_URLS[registrarLower];
    }
    
    // 部分匹配
    for (const [key, url] of Object.entries(REGISTRAR_URLS)) {
      if (registrarLower.includes(key) || key.includes(registrarLower)) {
        return url;
      }
    }
    
    return null;
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === 'N/A') return null;
    // Handle Chinese format: 2001年04月15日
    const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (chineseMatch) {
      return new Date(parseInt(chineseMatch[1]), parseInt(chineseMatch[2]) - 1, parseInt(chineseMatch[3]));
    }
    // Try ISO format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    return null;
  };

  const getRegistrationTag = (): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null => {
    const regDate = parseDate(data.registrationDate);
    if (!regDate) return null;
    
    const now = new Date();
    const diffTime = now.getTime() - regDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffDays <= 30) return { text: '新注册', variant: 'destructive' };
    if (diffDays <= 90) return { text: '3月内注册', variant: 'secondary' };
    if (diffDays <= 365) return { text: '1年内注册', variant: 'secondary' };
    if (diffYears >= 20) return { text: `${diffYears}年老米`, variant: 'default' };
    if (diffYears >= 10) return { text: `${diffYears}年域名`, variant: 'default' };
    if (diffYears >= 5) return { text: `${diffYears}年域名`, variant: 'outline' };
    return null;
  };

  const getUpdateTag = (): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null => {
    const updateDate = parseDate(data.lastUpdated);
    if (!updateDate) return null;
    
    const now = new Date();
    const diffTime = now.getTime() - updateDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Check status for transfer-related info
    const statusStr = data.status.join(' ').toLowerCase();
    if (statusStr.includes('pending transfer') || statusStr.includes('pendingtransfer')) {
      return { text: '转移中', variant: 'destructive' };
    }
    
    if (diffDays <= 7) {
      if (statusStr.includes('transfer')) return { text: '近期转移', variant: 'secondary' };
      return { text: '刚刚续费', variant: 'secondary' };
    }
    if (diffDays <= 30) return { text: '近期更新', variant: 'outline' };
    if (diffDays <= 90) return { text: '3月内更新', variant: 'outline' };
    return null;
  };

  const getExpirationTag = (): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null => {
    const expDate = parseDate(data.expirationDate);
    if (!expDate) return null;
    
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Check status for special states
    const statusStr = data.status.join(' ').toLowerCase();
    if (statusStr.includes('redemption')) return { text: '赎回期', variant: 'destructive' };
    if (statusStr.includes('pending delete') || statusStr.includes('pendingdelete')) return { text: '删除中', variant: 'destructive' };
    if (statusStr.includes('auto renew')) return { text: '自动续费期', variant: 'secondary' };
    
    if (diffDays < 0) {
      const expiredDays = Math.abs(diffDays);
      if (expiredDays <= 30) return { text: `已过期${expiredDays}天`, variant: 'destructive' };
      return { text: '已过期', variant: 'destructive' };
    }
    if (diffDays === 0) return { text: '今日到期', variant: 'destructive' };
    if (diffDays <= 7) return { text: `剩余${diffDays}天`, variant: 'destructive' };
    if (diffDays <= 30) return { text: `剩余${diffDays}天`, variant: 'secondary' };
    if (diffDays <= 90) return { text: `剩余${diffDays}天`, variant: 'outline' };
    return { text: `剩余${diffDays}天`, variant: 'outline' };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    if (dateStr.includes('年') && dateStr.includes('月')) {
      return dateStr;
    }
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
    const cleaned = status.toLowerCase().replace(/https?:\/\/[^\s]+/g, '').trim();
    if (STATUS_MAPPING[cleaned]) return STATUS_MAPPING[cleaned];
    const noSpaces = cleaned.replace(/\s+/g, '');
    if (STATUS_MAPPING[noSpaces]) return STATUS_MAPPING[noSpaces];
    if (STATUS_MAPPING[status]) return STATUS_MAPPING[status];
    const lastPart = status.split('/').pop()?.trim() || status;
    const lastPartLower = lastPart.toLowerCase();
    if (STATUS_MAPPING[lastPartLower]) return STATUS_MAPPING[lastPartLower];
    const lastPartNoSpaces = lastPartLower.replace(/\s+/g, '');
    if (STATUS_MAPPING[lastPartNoSpaces]) return STATUS_MAPPING[lastPartNoSpaces];
    return lastPart;
  };

  const registrationTag = getRegistrationTag();
  const updateTag = getUpdateTag();
  const expirationTag = getExpirationTag();
  const registrarUrl = getRegistrarUrl(data.registrar);

  // 格式化原始数据用于复制
  const getRawDataString = () => {
    return JSON.stringify(rawData || data, null, 2);
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
                  <TabsList className="bg-muted p-1 h-auto gap-1">
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
                  <div className="info-row-value flex items-center gap-2">
                    <span>{data.registrar || 'N/A'}</span>
                    {registrarUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(registrarUrl, '_blank')}
                        className="h-6 px-2 text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        官网
                      </Button>
                    )}
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-row-label">DNSSEC</div>
                  <div className="info-row-value">{data.dnssec ? '已启用' : '未启用'}</div>
                </div>
              <div className="info-row">
                  <div className="info-row-label">注册时间</div>
                  <div className="info-row-value flex items-center gap-2">
                    <span>{formatDate(data.registrationDate)}</span>
                    {registrationTag && (
                      <Badge variant={registrationTag.variant} className="text-xs">
                        {registrationTag.text}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-row-label">更新时间</div>
                  <div className="info-row-value flex items-center gap-2">
                    <span>{formatDate(data.lastUpdated)}</span>
                    {updateTag && (
                      <Badge variant={updateTag.variant} className="text-xs">
                        {updateTag.text}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-row-label">过期时间</div>
                  <div className="info-row-value flex items-center gap-2">
                    <span>{formatDate(data.expirationDate)}</span>
                    {expirationTag && (
                      <Badge variant={expirationTag.variant} className="text-xs">
                        {expirationTag.text}
                      </Badge>
                    )}
                  </div>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Info className="h-4 w-4" />
                原始WHOIS数据
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getRawDataString(), 'raw')}
                  className="h-8"
                >
                  {copiedRaw ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  复制全部
                </Button>
                <TabsList className="bg-muted p-1 h-auto gap-1">
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
              </div>
            </div>
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
