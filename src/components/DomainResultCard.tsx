import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Shield, Server, Copy, Check, ExternalLink, User, Clock, Lock, Globe, Trash2 } from 'lucide-react';
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
    phone?: string;
    state?: string;
    city?: string;
  };
  dnssec: boolean;
  lastUpdated: string;
  source: 'primary' | 'secondary';
}

const STATUS_MAPPING: Record<string, string> = {
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
  'ok': '正常',
  'active': '激活',
  'actif': '激活',
  'activo': '激活',
  'ativo': '激活',
  'inactive': '未激活',
  'inactif': '未激活',
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
  'connected': '已连接',
  'registered': '已注册',
  'available': '可用',
  'locked': '已锁定',
  'unlocked': '已解锁',
  'pending verification': '待验证',
  'verified': '已验证',
};

const REGISTRAR_URLS: Record<string, string> = {
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
  'squarespace': 'https://domains.squarespace.com',
  'squarespace domains': 'https://domains.squarespace.com',
  'squarespace domains llc': 'https://domains.squarespace.com',
  'squarespace domains ii llc': 'https://domains.squarespace.com',
  'amazon': 'https://aws.amazon.com/route53',
  'amazon registrar': 'https://aws.amazon.com/route53',
  'amazon registrar, inc.': 'https://aws.amazon.com/route53',
  'dynadot': 'https://www.dynadot.com',
  'dynadot, llc': 'https://www.dynadot.com',
  'dynadot llc': 'https://www.dynadot.com',
  'porkbun': 'https://www.porkbun.com',
  'porkbun llc': 'https://www.porkbun.com',
  'gandi': 'https://www.gandi.net',
  'gandi sas': 'https://www.gandi.net',
  'hover': 'https://www.hover.com',
  'tucows': 'https://www.tucows.com',
  'tucows domains': 'https://www.tucows.com',
  'tucows domains inc.': 'https://www.tucows.com',
  'enom': 'https://www.enom.com',
  'enom, llc': 'https://www.enom.com',
  'enom llc': 'https://www.enom.com',
  'name.com': 'https://www.name.com',
  'name.com, inc.': 'https://www.name.com',
  'register.com': 'https://www.register.com',
  'register.com, inc.': 'https://www.register.com',
  'network solutions': 'https://www.networksolutions.com',
  'network solutions, llc': 'https://www.networksolutions.com',
  'markmonitor': 'https://www.markmonitor.com',
  'markmonitor inc.': 'https://www.markmonitor.com',
  'markmonitor, inc.': 'https://www.markmonitor.com',
  'csc corporate domains': 'https://www.cscglobal.com',
  'csc corporate domains, inc.': 'https://www.cscglobal.com',
  'key-systems': 'https://www.key-systems.net',
  'key-systems gmbh': 'https://www.key-systems.net',
  'ovh': 'https://www.ovh.com',
  'ovh sas': 'https://www.ovh.com',
  'ionos': 'https://www.ionos.com',
  '1&1 ionos': 'https://www.ionos.com',
  '1&1 ionos se': 'https://www.ionos.com',
  'united-domains': 'https://www.united-domains.de',
  'united-domains ag': 'https://www.united-domains.de',
  'epik': 'https://www.epik.com',
  'epik, inc.': 'https://www.epik.com',
  'epik inc.': 'https://www.epik.com',
  'njalla': 'https://njal.la',
  'sav.com': 'https://www.sav.com',
  'sav.com, llc': 'https://www.sav.com',
  'spaceship': 'https://www.spaceship.com',
  'spaceship, inc.': 'https://www.spaceship.com',
  'namesilo': 'https://www.namesilo.com',
  'namesilo, llc': 'https://www.namesilo.com',
  'hostinger': 'https://www.hostinger.com',
  'hostinger operations': 'https://www.hostinger.com',
  'rebel': 'https://www.rebel.com',
  'rebel.com': 'https://www.rebel.com',
  'inmotion hosting': 'https://www.inmotionhosting.com',
  'bluehost': 'https://www.bluehost.com',
  'dreamhost': 'https://www.dreamhost.com',
  'hostgator': 'https://www.hostgator.com',
  'siteground': 'https://www.siteground.com',
  '阿里云': 'https://wanwang.aliyun.com',
  '万网': 'https://wanwang.aliyun.com',
  'alibaba': 'https://wanwang.aliyun.com',
  'alibaba cloud': 'https://wanwang.aliyun.com',
  'alibaba cloud computing': 'https://wanwang.aliyun.com',
  'alibaba cloud computing ltd.': 'https://wanwang.aliyun.com',
  'alibaba cloud computing (beijing) co., ltd.': 'https://wanwang.aliyun.com',
  'hichina': 'https://wanwang.aliyun.com',
  'hichina zhicheng': 'https://wanwang.aliyun.com',
  '腾讯云': 'https://dnspod.cloud.tencent.com',
  'tencent cloud': 'https://dnspod.cloud.tencent.com',
  'dnspod': 'https://www.dnspod.cn',
  '新网': 'https://www.xinnet.com',
  'xinnet': 'https://www.xinnet.com',
  'beijing xinnet': 'https://www.xinnet.com',
  '西部数码': 'https://www.west.cn',
  'west.cn': 'https://www.west.cn',
  'chengdu west dimension': 'https://www.west.cn',
  '爱名网': 'https://www.22.cn',
  '22.cn': 'https://www.22.cn',
  '易名': 'https://www.ename.net',
  'ename': 'https://www.ename.net',
  'ename technology': 'https://www.ename.net',
  '华为云': 'https://www.huaweicloud.com',
  'huawei cloud': 'https://www.huaweicloud.com',
  '聚名网': 'https://www.juming.com',
  'juming': 'https://www.juming.com',
  '美橙互联': 'https://www.cndns.com',
  'cndns': 'https://www.cndns.com',
  '中国万网': 'https://wanwang.aliyun.com',
  '商务中国': 'https://www.bizcn.com',
  'bizcn': 'https://www.bizcn.com',
  'onamae': 'https://www.onamae.com',
  'onamae.com': 'https://www.onamae.com',
  'gmo': 'https://www.gmo.jp',
  'gmo internet': 'https://www.gmo.jp',
  'gmo internet, inc.': 'https://www.gmo.jp',
  'whois corp.': 'https://www.whois.co.kr',
  'gabia': 'https://www.gabia.com',
  'gabia, inc.': 'https://www.gabia.com',
  'eurodns': 'https://www.eurodns.com',
  'eurodns s.a.': 'https://www.eurodns.com',
  'strato': 'https://www.strato.de',
  'strato ag': 'https://www.strato.de',
  'netim': 'https://www.netim.com',
  'netim sarl': 'https://www.netim.com',
  'infomaniak': 'https://www.infomaniak.com',
  'internetbs': 'https://internetbs.net',
  'internet.bs': 'https://internetbs.net',
  'cleannet.ge': 'https://www.cleannet.ge',
  'cleannet.ge ltd': 'https://www.cleannet.ge',
  'caucasus online': 'https://www.caucasus.net',
  'proservice': 'https://www.proservice.ge',
  'reg.ru': 'https://www.reg.ru',
  'regru-ru': 'https://www.reg.ru',
  'nic.ru': 'https://www.nic.ru',
  'ru-center': 'https://www.nic.ru',
  'bigrock': 'https://www.bigrock.in',
  'resellerclub': 'https://www.resellerclub.com',
  'publicdomainregistry': 'https://www.publicdomainregistry.com',
  'pdr ltd': 'https://www.publicdomainregistry.com',
  'crazy domains': 'https://www.crazydomains.com',
  'ventraip': 'https://ventraip.com.au',
  'domain.com': 'https://www.domain.com',
  'domain.com, llc': 'https://www.domain.com',
  '101domain': 'https://www.101domain.com',
  '101domain, inc.': 'https://www.101domain.com',
  'safenames': 'https://www.safenames.net',
  'safenames ltd': 'https://www.safenames.net',
  'encirca': 'https://www.encirca.com',
  'encirca, inc.': 'https://www.encirca.com',
  'webnic': 'https://www.webnic.cc',
  'web commerce communications': 'https://www.webnic.cc',
};

const NS_PROVIDER_MAPPING: Record<string, string> = {
  'cloudflare.net': 'Cloudflare',
  'alidns.com': '阿里云DNS',
  'dnspod.cn': 'DNSPod',
  'dns.baidu.com': '百度云加速',
  'ns.amazonaws.com': 'Amazon Route 53',
  'googledomains.com': 'Google Cloud DNS',
  'dns.google': 'Google Cloud DNS',
  'huaweicloud-dns.cn': '华为云DNS',
  'ns.aliyun.com': '阿里云DNS',
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
    if (REGISTRAR_URLS[registrarLower]) return REGISTRAR_URLS[registrarLower];
    for (const [key, url] of Object.entries(REGISTRAR_URLS)) {
      if (registrarLower.includes(key) || key.includes(registrarLower)) return url;
    }
    return null;
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === 'N/A') return null;
    const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (chineseMatch) {
      return new Date(parseInt(chineseMatch[1]), parseInt(chineseMatch[2]) - 1, parseInt(chineseMatch[3]));
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    return null;
  };

  const isPrivacyProtected = () => {
    if (!data.registrant) return true;
    const values = Object.values(data.registrant || {}).join(' ').toLowerCase();
    return (
      values.includes('privacy') ||
      values.includes('redacted') ||
      values.includes('protected') ||
      values.includes('withheld') ||
      !hasRegistrantInfo
    );
  };

  const getNsProvider = () => {
    if (!data.nameServers || data.nameServers.length === 0) return null;
    for (const ns of data.nameServers) {
      const lower = ns.toLowerCase();
      for (const [key, name] of Object.entries(NS_PROVIDER_MAPPING)) {
        if (lower.includes(key)) return name;
      }
    }
    return null;
  };

  const getRegistrationTag = (): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null => {
    const regDate = parseDate(data.registrationDate);
    if (!regDate) return null;
    const now = new Date();
    const diffTime = now.getTime() - regDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffYears = Math.floor(diffDays / 365);
    const diffMonths = Math.floor((diffDays % 365) / 30);
    if (diffDays <= 30) return { text: '新注册', variant: 'destructive' };
    if (diffDays <= 90) return { text: '3月内注册', variant: 'secondary' };
    if (diffDays <= 365) return { text: '1年内注册', variant: 'secondary' };
    if (diffYears >= 20) return { text: `${diffYears}年老米`, variant: 'default' };
    if (diffYears >= 10) return { text: `${diffYears}年${diffMonths}个月老米`, variant: 'default' };
    if (diffYears >= 5) return { text: `${diffYears}年${diffMonths}个月域名`, variant: 'outline' };
    return null;
  };

  const getUpdateTag = (): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null => {
    const statusStr = data.status.join(' ').toLowerCase();
    if (statusStr.includes('pending transfer') || statusStr.includes('pendingtransfer')) {
      return { text: '转移中', variant: 'destructive' };
    }
    const updateDate = parseDate(data.lastUpdated);
    if (!updateDate) return null;
    const now = new Date();
    const diffTime = now.getTime() - updateDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return null;
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
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60)) % 24;
    const statusStr = data.status.join(' ').toLowerCase();
    if (statusStr.includes('redemption')) return { text: '赎回期', variant: 'destructive' };
    if (statusStr.includes('pending delete') || statusStr.includes('pendingdelete')) return { text: '删除中', variant: 'destructive' };
    if (statusStr.includes('auto renew')) return { text: '自动续费期', variant: 'secondary' };
    if (diffDays < 0) {
      const expiredDays = Math.abs(diffDays);
      if (expiredDays <= 30) return { text: `已过期${expiredDays}天`, variant: 'destructive' };
      return { text: '已过期', variant: 'destructive' };
    }
    if (diffDays === 0) {
      if (diffHours > 0) return { text: `今日剩余${diffHours}小时`, variant: 'destructive' };
      return { text: '今日到期', variant: 'destructive' };
    }
    if (diffDays <= 7) return { text: `剩余${diffDays}天`, variant: 'destructive' };
    if (diffDays <= 30) return { text: `剩余${diffDays}天`, variant: 'secondary' };
    if (diffDays <= 90) return { text: `剩余${diffDays}天`, variant: 'outline' };
    return { text: `剩余${diffDays}天`, variant: 'outline' };
  };

  const getExpirationBadgeClass = () => {
    const expDate = parseDate(data.expirationDate);
    if (!expDate) return '';
    const now = new Date();
    const diffDays = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'bg-red-100 text-red-800 border-red-200';
    if (diffDays <= 7) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (diffDays <= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    if (dateStr.includes('年') && dateStr.includes('月')) return dateStr;
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
  const expirationTag = getExpirationTag();
  const registrarUrl = getRegistrarUrl(data.registrar);
  const isQueryTime = (): boolean => {
    const updateDate = parseDate(data.lastUpdated);
    if (!updateDate) return false;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updateDate.getTime());
    const hoursFromNow = diffTime / (1000 * 60 * 60);
    return hoursFromNow < 2;
  };
  const showAsQueryTime = isQueryTime();
  const updateTag = showAsQueryTime ? null : getUpdateTag();
  const hasRegistrantInfo = data.registrant && (
    data.registrant.name || 
    data.registrant.organization || 
    data.registrant.country || 
    data.registrant.email || 
    data.registrant.phone ||
    data.registrant.state ||
    data.registrant.city
  );
  const privacyProtected = isPrivacyProtected();
  const nsProvider = getNsProvider();
  const clientStatuses = data.status.filter(s => s.toLowerCase().includes('client'));
  const serverStatuses = data.status.filter(s => s.toLowerCase().includes('server'));
  const otherStatuses = data.status.filter(s => !s.toLowerCase().includes('client') && !s.toLowerCase().includes('server'));
  const getRawDataString = () => JSON.stringify(rawData || data, null, 2);

  return (
    <Card className="border">
      <CardContent className="p-0">
        <Tabs defaultValue="overview" className="w-full">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold uppercase break-all">{data.domain}</h2>
          </div>

          <TabsContent value="overview" className="p-6 space-y-6 mt-0">
            {/* ... 这里保持你原本的 Overview 内容不变 ... */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Info className="h-4 w-4" />
                  域名信息
                </h3>
                <div className="flex items-center gap-2">
                  <TabsList className="bg-muted p-1 h-auto gap-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-xs">
                      标准
                    </TabsTrigger>
                    <TabsTrigger value="raw" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-xs">
                      数据
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
                      <Button variant="outline" size="sm" onClick={() => window.open(registrarUrl, '_blank')} className="h-6 px-2 text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        官网
                      </Button>
                    )}
                  </div>
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
                {!showAsQueryTime && data.lastUpdated && (
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
                )}
                <div className="info-row">
                  <div className="info-row-label">过期时间</div>
                  <div className="info-row-value flex items-center gap-2">
                    <span>{formatDate(data.expirationDate)}</span>
                    {expirationTag && (
                      <Badge variant={expirationTag.variant} className={`text-xs border ${getExpirationBadgeClass()}`}>
                        {expirationTag.text}
                      </Badge>
                    )}
                  </div>
                </div>
                {showAsQueryTime && data.lastUpdated && (
                  <div className="info-row">
                    <div className="info-row-label flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      查询时间
                    </div>
                    <div className="info-row-value">
                      <span>{formatDate(data.lastUpdated)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {hasRegistrantInfo && (
              <div>
                <h3 className="section-title">
                  <User className="h-4 w-4" />
                  注册人信息
                </h3>
                <div className="space-y-2">
                  {data.registrant?.name && (
                    <div className="info-row">
                      <div className="info-row-label">姓名</div>
                      <div className="info-row-value">{data.registrant.name}</div>
                    </div>
                  )}
                  {data.registrant?.organization && (
                    <div className="info-row">
                      <div className="info-row-label">组织</div>
                      <div className="info-row-value">{data.registrant.organization}</div>
                    </div>
                  )}
                  {data.registrant?.email && (
                    <div className="info-row">
                      <div className="info-row-label">邮箱</div>
                      <div className="info-row-value">{data.registrant.email}</div>
                    </div>
                  )}
                  {data.registrant?.phone && (
                    <div className="info-row">
                      <div className="info-row-label">电话</div>
                      <div className="info-row-value">{data.registrant.phone}</div>
                    </div>
                  )}
                  {(data.registrant?.city || data.registrant?.state) && (
                    <div className="info-row">
                      <div className="info-row-label">地区</div>
                      <div className="info-row-value">
                        {[data.registrant.city, data.registrant.state].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}
                  {data.registrant?.country && (
                    <div className="info-row">
                      <div className="info-row-label">国家</div>
                      <div className="info-row-value">{data.registrant.country}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="section-title">
                <Shield className="h-4 w-4" />
                域名状态
              </h3>
              <div className="space-y-3">
                {clientStatuses.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">客户端状态</div>
                    <div className="flex flex-wrap gap-2">
                      {clientStatuses.map((status, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {getStatusChinese(status)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {serverStatuses.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">服务器状态</div>
                    <div className="flex flex-wrap gap-2">
                      {serverStatuses.map((status, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {getStatusChinese(status)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {otherStatuses.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">其他状态</div>
                    <div className="flex flex-wrap gap-2">
                      {otherStatuses.map((status, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {getStatusChinese(status)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(clientStatuses.length === 0 && serverStatuses.length === 0 && otherStatuses.length === 0) && (
                  <Badge variant="secondary" className="text-xs">正常</Badge>
                )}
                <div className="mt-4 pt-3 border-t flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">DNSSEC:</span>
                  <Badge variant={data.dnssec ? "default" : "outline"} className="text-xs">
                    {data.dnssec ? '已启用' : '未启用'}
                  </Badge>
                </div>
                {privacyProtected && (
                  <div className="mt-3 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-600" />
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      WHOIS隐私保护已启用
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {data.nameServers && data.nameServers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="section-title">
                    <Server className="h-4 w-4" />
                    域名服务器
                  </h3>
                  {nsProvider && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <Badge variant="outline" className="text-xs">
                        {nsProvider} 解析
                      </Badge>
                    </div>
                  )}
                </div>
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
                        {copiedNs === ns ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span className="ml-1">复制</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="raw" className="p-6 mt-0">
            {/* ... 这里保持你原本的 Raw 内容不变 ... */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Info className="h-4 w-4" />
                原始数据
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getRawDataString(), 'raw')}
                  className="h-8"
                >
                  {copiedRaw ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  复制全部
                </Button>
                <TabsList className="bg-muted p-1 h-auto gap-1">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-xs">
                    标准
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-xs">
                    数据
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[500px] font-mono break-all whitespace-pre-wrap">
              {getRawDataString()}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* --- 修改后的 Footer 部分 --- */}
      <CardFooter className="flex flex-col w-full p-4 gap-6 border-t bg-muted/30">
        
        {/* 1. 最近查询 (移至上方) */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-sm font-bold text-foreground">最近查询</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3 mr-1" />
              清空
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 px-2">
            {['hello.com', 'wei.ge', 'ge.ge'].map((domain) => (
              <Badge key={domain} variant="secondary" className="bg-background border font-normal cursor-pointer hover:bg-muted">
                {domain}
              </Badge>
            ))}
          </div>
        </div>

        {/* 2. 徽章区域 (缩放至一排显示，不超出屏幕) */}
        <div className="w-full overflow-hidden px-2">
          <div className="flex flex-nowrap items-center justify-center gap-4 sm:gap-8">
            <img src="/logo.png" alt="NIC.BN" className="h-10 sm:h-14 w-auto object-contain flex-shrink-1 min-w-0" />
            <img src="/heise.png" alt="CHINA.TN" className="h-10 sm:h-14 w-auto object-contain flex-shrink-1 min-w-0" />
            <img src="/domainbf.png" alt="DOMAIN.BF" className="h-6 sm:h-8 w-auto object-contain flex-shrink-1 min-w-0 opacity-80" />
            <img src="/x.rw.png" alt="X.RW" className="h-6 sm:h-8 w-auto object-contain flex-shrink-1 min-w-0 opacity-80" />
          </div>
        </div>

        {/* 3. 版权放置页面底部 */}
        <div className="text-xs text-muted-foreground/60 text-center pb-2">
          © 2026 不讲·李. All rights reserved.
        </div>

      </CardFooter>
    </Card>
  );
};

export default DomainResultCard;
