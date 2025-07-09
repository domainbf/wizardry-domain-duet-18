import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Globe, Server, Clock, Shield, AlertCircle, CheckCircle, Loader2, Network, FileText, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface LookupResult {
  primary?: WhoisData;
  secondary?: WhoisData;
  error?: string;
  errorType?: string;
}

// 域名状态中英文映射
const STATUS_MAPPING: Record<string, string> = {
  // 客户端状态
  'client delete prohibited': '客户端禁止删除',
  'client transfer prohibited': '客户端禁止转移', 
  'client update prohibited': '客户端禁止更新',
  'client renew prohibited': '客户端禁止续费',
  'client hold': '客户端暂停',
  'clientDeleteProhibited': '客户端禁止删除',
  'clientTransferProhibited': '客户端禁止转移',
  'clientUpdateProhibited': '客户端禁止更新',
  'clientRenewProhibited': '客户端禁止续费',
  'clientHold': '客户端暂停',
  
  // 服务器状态
  'server delete prohibited': '服务器禁止删除',
  'server transfer prohibited': '服务器禁止转移',
  'server update prohibited': '服务器禁止更新',
  'server renew prohibited': '服务器禁止续费',
  'server hold': '服务器暂停',
  'serverDeleteProhibited': '服务器禁止删除',
  'serverTransferProhibited': '服务器禁止转移',
  'serverUpdateProhibited': '服务器禁止更新',
  'serverRenewProhibited': '服务器禁止续费',
  'serverHold': '服务器暂停',
  
  // 一般状态
  'ok': '正常',
  'active': '激活',
  'inactive': '未激活',
  'locked': '已锁定',
  'reserved': '已保留',
  'available': '可注册',
  'registered': '已注册',
  
  // 等待状态
  'pending create': '等待创建',
  'pending delete': '等待删除',
  'pending renew': '等待续费',
  'pending restore': '等待恢复',
  'pending transfer': '等待转移',
  'pending update': '等待更新',
  'pendingCreate': '等待创建',
  'pendingDelete': '等待删除',
  'pendingRenew': '等待续费',
  'pendingRestore': '等待恢复',
  'pendingTransfer': '等待转移',
  'pendingUpdate': '等待更新',
  
  // 特殊期间
  'redemption period': '赎回期',
  'auto renew period': '自动续费期',
  'grace period': '宽限期',
  'redemptionPeriod': '赎回期',
  'autoRenewPeriod': '自动续费期',
  'gracePeriod': '宽限期',
  
  // 其他状态
  'expired': '已过期',
  'suspended': '已暂停',
  'terminated': '已终止',
  'addPeriod': '添加期',
  'renewPeriod': '续费期',
  'transferPeriod': '转移期'
};

const DomainLookup = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{primary?: WhoisData, rawData?: any, error?: string, errorType?: string} | null>(null);
  const [error, setError] = useState<string>('');
  const [showRawData, setShowRawData] = useState(false);
  const { toast } = useToast();

  // 合并并优化查询结果
  const mergeResults = (data: any): {result: WhoisData | null, rawData: any} => {
    const primary = data.primary;
    const secondary = data.secondary;
    
    if (!primary && !secondary) return {result: null, rawData: data};
    
    // 优先使用RDAP数据，补充WHOIS数据
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
    
    return {result, rawData: data};
  };

  // Real dual-system lookup function
  const performDualLookup = async (domainName: string): Promise<{primary?: WhoisData, rawData?: any, error?: string, errorType?: string}> => {
    try {
      const response = await supabase.functions.invoke('domain-lookup', {
        body: { domain: domainName }
      });

      if (response.error) {
        console.error('Supabase function error:', response.error);
        return { error: '查询服务暂时不可用，请稍后重试' };
      }

      const data = response.data;
      
      if (data.error) {
        // 根据错误类型提供具体的错误信息
        let specificError = data.error;
        if (data.errorType === 'domain_not_found') {
          specificError = `域名 ${domainName} 未注册，该域名可供注册使用`;
        } else if (data.errorType === 'domain_reserved') {
          specificError = `域名 ${domainName} 为保留域名，不可注册`;
        } else if (data.errorType === 'domain_restricted') {
          specificError = `域名 ${domainName} 为受限域名，需特殊申请`;
        } else if (data.errorType === 'unsupported_tld') {
          specificError = data.error;
        }
        
        return { 
          error: specificError,
          errorType: data.errorType 
        };
      }

      // 合并为单一最优结果
      const mergedData = mergeResults(data);
      if (mergedData.result) {
        return { primary: mergedData.result, rawData: mergedData.rawData };
      } else {
        return { error: '未找到域名信息' };
      }
      
    } catch (error) {
      console.error('Domain lookup error:', error);
      return { error: '网络连接错误，请检查网络后重试' };
    }
  };

  const handleLookup = async () => {
    setError('');
    
    if (!domain.trim()) {
      setError("域名不能为空，请输入要查询的域名");
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.trim())) {
      setError("域名格式无效，请输入有效的域名格式，如：example.com");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const lookupResult = await performDualLookup(domain.trim().toLowerCase());
      setResult(lookupResult);
      
      if (lookupResult.error) {
        setError(lookupResult.error);
      } else {
        // 成功后自动滚动到结果区域
        setTimeout(() => {
          const resultElement = document.getElementById('domain-results');
          if (resultElement) {
            resultElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 100);
      }
    } catch (error) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const renderWhoisCard = (data: WhoisData) => (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          域名信息查询结果
          <Badge variant="default">
            {data.source === 'primary' ? 'RDAP查询' : 'WHOIS查询'}
          </Badge>
        </CardTitle>
        <CardDescription>域名: {data.domain}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              注册信息
            </h4>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">注册商:</span> {data.registrar}</div>
              <div><span className="text-muted-foreground">注册日期:</span> {data.registrationDate}</div>
              <div><span className="text-muted-foreground">到期日期:</span> {data.expirationDate}</div>
              <div><span className="text-muted-foreground">最后更新:</span> {
                data.lastUpdated.includes('T') 
                  ? new Date(data.lastUpdated).toLocaleDateString('zh-CN')
                  : data.lastUpdated
              }</div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              安全状态
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">DNSSEC:</span>
                {data.dnssec ? (
                  <Badge variant="default" className="h-5 px-2 text-xs">启用</Badge>
                ) : (
                  <Badge variant="destructive" className="h-5 px-2 text-xs">未启用</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Network className="h-4 w-4" />
            域名服务器
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.nameServers.map((ns, index) => (
              <Badge key={index} variant="outline" className="justify-start">
                {ns}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            域名状态
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.status.map((status, index) => {
              const chineseStatus = STATUS_MAPPING[status.toLowerCase()] || 
                                   STATUS_MAPPING[status] || 
                                   status;
              return (
                <Badge key={index} variant="secondary" className="text-xs">
                  {chineseStatus}
                </Badge>
              );
            })}
          </div>
        </div>

        {data.registrant && Object.keys(data.registrant).length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">注册人信息</h4>
              <div className="space-y-1 text-sm">
                {data.registrant.name && <div><span className="text-muted-foreground">姓名:</span> {data.registrant.name}</div>}
                {data.registrant.organization && <div><span className="text-muted-foreground">组织:</span> {data.registrant.organization}</div>}
                {data.registrant.country && <div><span className="text-muted-foreground">国家:</span> {data.registrant.country}</div>}
                {data.registrant.email && <div><span className="text-muted-foreground">邮箱:</span> {data.registrant.email}</div>}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Search Section */}
      <Card className="glass-card glow-effect">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl gradient-text">双系统域名查询</CardTitle>
          <CardDescription>
            同时查询多个whois服务器，确保数据准确性和完整性
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="输入域名，如：example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleLookup()}
              className="flex-1"
              disabled={loading}
            />
            <Button 
              onClick={handleLookup}
              disabled={loading}
              variant="wizard"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? '查询中...' : '查询'}
            </Button>
          </div>
          
          {/* 错误提示显示在搜索框下方 - 优化设计 */}
          {error && (
            <div className="mt-4 p-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-destructive/15 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-destructive mb-1">查询结果</h4>
                  <p className="text-sm text-destructive/90 leading-relaxed">{error}</p>
                  {result?.errorType === 'domain_not_found' && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      💡 提示：该域名可通过正规域名注册商进行注册
                    </div>
                  )}
                  {result?.errorType === 'domain_reserved' && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      ⚠️ 提示：保留域名通常需要特殊资质才能申请
                    </div>
                  )}
                  {result?.errorType === 'unsupported_tld' && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      🔍 提示：可尝试使用其他域名后缀进行查询
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      <div id="domain-results">
        {loading && (
          <Card className="glass-card">
            <CardContent className="py-8">
              <div className="flex items-center justify-center space-x-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-lg font-semibold">正在查询域名信息...</p>
                  <p className="text-sm text-muted-foreground">智能切换查询系统，请稍候</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {result && !loading && result.primary && (
          <div className="space-y-6">
            {/* Success indicator */}
            <Card className="glass-card border-primary/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-center space-x-4 text-primary">
                  <CheckCircle className="h-6 w-6" />
                  <div className="text-center">
                    <p className="font-semibold">查询成功</p>
                    <p className="text-sm text-muted-foreground">
                      已获取完整域名信息
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Domain Result */}
            {renderWhoisCard(result.primary)}

            {/* Raw Data Section */}
            {result.rawData && (
              <Card className="glass-card">
                <Collapsible open={showRawData} onOpenChange={setShowRawData}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {showRawData ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          原始数据查看
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showRawData ? 'rotate-180' : ''}`} />
                      </CardTitle>
                      <CardDescription>
                        点击查看从服务器返回的原始查询数据
                      </CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96">
                        {JSON.stringify(result.rawData, null, 2)}
                      </pre>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainLookup;