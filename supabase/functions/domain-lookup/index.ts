import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WHOIS服务器列表
const WHOIS_SERVERS: Record<string, string> = {
  'sn': 'whois.nic.sn',
  'net': 'whois.verisign-grs.com',
  'org': 'whois.pir.org',
  'info': 'whois.afilias.net',
  'biz': 'whois.biz',
  'us': 'whois.nic.us',
  'uk': 'whois.nic.uk',
  'de': 'whois.denic.de',
  'fr': 'whois.afnic.fr',
  'it': 'whois.nic.it',
  'nl': 'whois.domain-registry.nl',
  'be': 'whois.dns.be',
  'ch': 'whois.nic.ch',
  'at': 'whois.nic.at',
  'es': 'whois.nic.es',
  'pl': 'whois.dns.pl',
  'ru': 'whois.tcinet.ru',
  'cn': 'whois.cnnic.cn',
  'jp': 'whois.jprs.jp',
  'kr': 'whois.kr',
  'au': 'whois.auda.org.au',
  'ca': 'whois.cira.ca',
  'mx': 'whois.mx',
  'br': 'whois.registro.br',
  'in': 'whois.inregistry.net',
  'tw': 'whois.twnic.net.tw',
  'sg': 'whois.sgnic.sg',
  'hk': 'whois.hkirc.hk',
  'th': 'whois.thnic.co.th',
  'my': 'whois.mynic.my',
  'id': 'whois.pandi.or.id',
  'ph': 'whois.dot.ph',
  'vn': 'whois.vnnic.vn',
  'cc': 'whois.nic.cc',
  'tv': 'whois.nic.tv',
  'me': 'whois.nic.me',
  'co': 'whois.nic.co',
  'io': 'whois.nic.io',
  'ly': 'whois.nic.ly',
  'sc': 'whois2.afilias-grs.net',
  'la': 'whois.nic.la',
  'mn': 'whois.nic.mn',
  'tel': 'whois.nic.tel',
  'name': 'whois.nic.name',
  'mobi': 'whois.dotmobiregistry.net',
  'travel': 'whois.nic.travel',
  'museum': 'whois.museum',
  'aero': 'whois.aero',
  'coop': 'whois.nic.coop',
  'pro': 'whois.registrypro.pro',
  'xxx': 'whois.nic.xxx',
  'asia': 'whois.nic.asia',
  'bn': 'whois.bnnic.bn'
};

// RDAP服务器列表
const RDAP_SERVERS: Record<string, string> = {
  'com': 'https://rdap.verisign.com/com/v1',
  'net': 'https://rdap.verisign.com/net/v1',
  'org': 'https://rdap.publicinterestregistry.org',
  'info': 'https://rdap.afilias.net/rdap/afilias',
  'biz': 'https://rdap.afilias.net/rdap/afilias',
  'us': 'https://rdap.nic.us',
  'af': 'https://rdap.nic.af',
  'uk': 'https://rdap.nominet.uk',
  'de': 'https://rdap.denic.de',
  'fr': 'https://rdap.nic.fr',
  'it': 'https://rdap.nic.it',
  'ke': 'https://rdap.kenic.or.ke',
  'be': 'https://rdap.dns.be',
  'ch': 'https://rdap.nic.ch',
  'at': 'https://rdap.nic.at',
  'es': 'https://rdap.nic.es',
  'au': 'https://rdap.nic.au',
  'ca': 'https://rdap.ca',
  'jp': 'https://rdap.jprs.jp',
  'cn': 'https://rdap.cnnic.cn',
  'cc': 'https://rdap.nic.cc',
  'tv': 'https://rdap.nic.tv',
  'me': 'https://rdap.nic.me',
  'co': 'https://rdap.nic.co',
  'io': 'https://rdap.nic.io'
};

// 解析域名获取TLD
function getTLD(domain: string): string {
  const parts = domain.toLowerCase().split('.');
  if (parts.length >= 2) {
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    
    // 处理二级域名如.co.uk, .com.au等
    if (tld === 'uk' && ['co', 'org', 'net', 'ac', 'gov'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'au' && ['com', 'net', 'org', 'edu', 'gov', 'asn', 'id'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    
    return tld;
  }
  return '';
}

// RDAP查询
async function queryRDAP(domain: string): Promise<any> {
  const tld = getTLD(domain);
  const rdapServer = RDAP_SERVERS[tld];
  
  if (!rdapServer) {
    throw new Error(`RDAP not supported for .${tld} domains`);
  }

  console.log(`Querying RDAP for ${domain} via ${rdapServer}`);
  
  try {
    // 创建手动超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${rdapServer}/domain/${domain}`, {
      headers: {
        'Accept': 'application/rdap+json',
        'User-Agent': 'Whois-Wizardry/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('domain_not_found');
      }
      if (response.status === 403) {
        throw new Error('domain_restricted');
      }
      throw new Error(`RDAP query failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return parseRDAPResponse(data);
  } catch (error) {
    console.error(`RDAP query failed for ${domain}:`, error);
    throw error;
  }
}

// HTTP WHOIS查询 - 使用多个可靠的WHOIS服务
async function queryWHOIS(domain: string): Promise<any> {
  const tld = getTLD(domain);
  
  console.log(`Querying WHOIS for ${domain} via HTTP APIs`);
  
  try {
    // 使用更可靠的WHOIS API服务
    const whoisServices = [
      {
        name: 'WhoisFreaks',
        url: `https://api.whoisfreaks.com/v1.0/whois?apiKey=FREE&whois=live&domainName=${domain}`,
        parseResponse: (data: any) => {
          if (data && data.whois_raw) {
            return parseWhoisText(data.whois_raw, domain);
          }
          return null;
        }
      },
      {
        name: 'IP2WHOIS',
        url: `https://api.ip2whois.com/v2?key=demo&domain=${domain}&format=json`,
        parseResponse: (data: any) => {
          if (data && data.domain) {
            return {
              domain: domain,
              registrar: data.registrar || 'Unknown',
              registrationDate: data.create_date ? formatDate(data.create_date) : null,
              expirationDate: data.expire_date ? formatDate(data.expire_date) : null,
              nameServers: data.nameservers ? data.nameservers.split(',').map((ns: string) => ns.trim()).filter(Boolean) : [],
              status: data.domain_status ? [data.domain_status] : [],
              dnssec: false,
              lastUpdated: data.update_date ? formatDate(data.update_date) : `${new Date().getFullYear()}年${String(new Date().getMonth() + 1).padStart(2, '0')}月${String(new Date().getDate()).padStart(2, '0')}日`,
              source: 'whois' as const,
              registrant: data.registrant_name ? {
                name: data.registrant_name,
                organization: data.registrant_organization,
                country: data.registrant_country
              } : {}
            };
          }
          return null;
        }
      },
      {
        name: 'WhoisJSON',
        url: `https://whoisjson.com/api/v1/whois?domain=${domain}`,
        parseResponse: (data: any) => {
          if (data && data.status === 'success' && data.result) {
            const result = data.result;
            return {
              domain: domain,
              registrar: result.registrar || 'Unknown',
              registrationDate: result.created ? formatDate(result.created) : null,
              expirationDate: result.expires ? formatDate(result.expires) : null,
              nameServers: result.nameservers || [],
              status: result.status ? [result.status] : [],
              dnssec: false,
              lastUpdated: result.updated ? formatDate(result.updated) : `${new Date().getFullYear()}年${String(new Date().getMonth() + 1).padStart(2, '0')}月${String(new Date().getDate()).padStart(2, '0')}日`,
              source: 'whois' as const,
              registrant: {}
            };
          }
          return null;
        }
      }
    ];
    
    for (const service of whoisServices) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        console.log(`Trying ${service.name} API for ${domain}`);
        
        const response = await fetch(service.url, {
          headers: {
            'User-Agent': 'Whois-Lookup-Service/1.0',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.log(`${service.name} API failed with status: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`${service.name} response:`, JSON.stringify(data, null, 2));
        
        const parsedResult = service.parseResponse(data);
        
        if (parsedResult && (parsedResult.registrar !== 'Unknown' || parsedResult.registrationDate || parsedResult.nameServers.length > 0)) {
          console.log(`${service.name} API successful, found valid data`);
          return parsedResult;
        }
        
      } catch (error) {
        console.log(`${service.name} API attempt failed:`, error.message);
        continue;
      }
    }
    
    // 如果所有API都失败，抛出错误
    throw new Error('All WHOIS APIs failed to return valid data');
    
  } catch (error) {
    console.error(`WHOIS query failed for ${domain}:`, error);
    throw error;
  }
}

// 解析纯文本WHOIS响应
function parseWhoisText(text: string, domain: string): any {
  const lines = text.split('\n');
  const result: any = { 
    domain,
    registrar: 'Unknown',
    registrationDate: null,
    expirationDate: null,
    nameServers: [],
    status: [],
    dnssec: false,
    lastUpdated: `${new Date().getFullYear()}年${String(new Date().getMonth() + 1).padStart(2, '0')}月${String(new Date().getDate()).padStart(2, '0')}日`,
    source: 'whois' as const,
    registrant: {}
  };
  
  // 检查域名状态关键词
  const textLower = text.toLowerCase();
  
  // 域名未注册的严格标识 - 更精确的匹配
  const notFoundIndicators = [
    'no match for domain', 'not found in database', 'no data found for',
    'domain is not registered', 'available for registration', 'status: free',
    'status: available', 'no matching record found', 'no such domain exists',
    'object does not exist', 'domain not found in registry', 'not exist in registry',
    'domain name not found', 'domain is available', 'no domain found'
  ];
  
  // 域名保留/受限的严格标识 - 避免误判
  const reservedIndicators = [
    'reserved domain', 'restricted domain', 'domain is reserved',
    'domain is restricted', 'registry reserved', 'registrar reserved',
    'quarantined domain', 'domain quarantined', 'premium domain name',
    'registry lock applied', 'registrar lock applied'
  ];
  
  // 首先检查是否有实际的域名信息 - 避免误判
  let hasRegistrarInfo = false;
  let hasValidDates = false;
  let hasNameServers = false;
  
  // 检查关键信息是否存在
  for (const line of lines) {
    const trimmed = line.trim();
    const lowerLine = trimmed.toLowerCase();
    
    if (lowerLine.includes('registrar:') && !lowerLine.includes('not available')) {
      hasRegistrarInfo = true;
    }
    if (lowerLine.includes('creation date:') || lowerLine.includes('created:') || 
        lowerLine.includes('registration time:') || lowerLine.includes('expires:')) {
      hasValidDates = true;
    }
    if (lowerLine.includes('name server:') || lowerLine.includes('nserver:')) {
      hasNameServers = true;
    }
  }
  
  // 如果有关键域名信息，说明域名已注册 - 不进行未注册判断
  if (hasRegistrarInfo || hasValidDates || hasNameServers) {
    // 域名已注册，继续解析
  } else {
    // 只有在明确没有注册信息时才检查未注册标识
    if (notFoundIndicators.some(indicator => textLower.includes(indicator))) {
      throw new Error('domain_not_found');
    }
    
    // 检查是否为保留/受限域名 - 更严格的匹配
    if (reservedIndicators.some(indicator => textLower.includes(indicator))) {
      throw new Error('domain_reserved');
    }
  }
  
  for (const line of lines) {
    const trimmed = line.trim();
    const lowerLine = trimmed.toLowerCase();
    
    // 注册商信息 - 扩展更多匹配模式
    if (lowerLine.includes('registrar:') || lowerLine.includes('registrar name:') || 
        lowerLine.includes('registrar organization:') || lowerLine.includes('sponsoring registrar:') ||
        lowerLine.includes('registrar id:') || lowerLine.includes('registrar company:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const registrarValue = parts.slice(1).join(':').trim();
        if (registrarValue && registrarValue !== 'Unknown' && registrarValue !== '-') {
          result.registrar = registrarValue;
        }
      }
    }
    // 创建日期 - 扩展更多匹配模式
    else if (lowerLine.includes('creation date:') || lowerLine.includes('created:') || 
             lowerLine.includes('created on:') || lowerLine.includes('registration time:') ||
             lowerLine.includes('registered on:') || lowerLine.includes('registered:') ||
             lowerLine.includes('domain registered:') || lowerLine.includes('registration date:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        result.registrationDate = formatDate(parts.slice(1).join(':').trim());
      }
    }
    // 到期日期 - 扩展更多匹配模式
    else if (lowerLine.includes('expiry date:') || lowerLine.includes('expires:') || 
             lowerLine.includes('expiration date:') || lowerLine.includes('expires on:') || 
             lowerLine.includes('expiration time:') || lowerLine.includes('registry expiry date:') ||
             lowerLine.includes('domain expires:') || lowerLine.includes('expire date:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        result.expirationDate = formatDate(parts.slice(1).join(':').trim());
      }
    }
    // DNS服务器 - 扩展更多匹配模式
    else if (lowerLine.includes('name server:') || lowerLine.includes('nserver:') || 
             lowerLine.includes('nameserver:') || lowerLine.includes('dns:') ||
             lowerLine.includes('ns1:') || lowerLine.includes('ns2:') || 
             lowerLine.includes('dns1:') || lowerLine.includes('dns2:') ||
             lowerLine.includes('primary dns:') || lowerLine.includes('secondary dns:') ||
             lowerLine.includes('domain servers:') || lowerLine.includes('name servers:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const ns = parts.slice(1).join(':').trim().toLowerCase();
        // 清理DNS服务器名称，移除多余的空格和符号
        const cleanNs = ns.replace(/\s+/g, ' ').trim();
        if (cleanNs && cleanNs !== '-' && cleanNs !== 'not available' && 
            !result.nameServers.includes(cleanNs)) {
          result.nameServers.push(cleanNs);
        }
      }
    }
    // 域名状态
    else if (lowerLine.includes('domain status:') || lowerLine.includes('status:') || lowerLine.includes('domain state:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const statusText = parts.slice(1).join(':').trim();
        // 提取多个状态
        const statuses = statusText.split(/[,;\s]+/).filter(s => s.length > 0);
        statuses.forEach(status => {
          const cleanStatus = status.split(' ')[0];
          if (cleanStatus && !result.status.includes(cleanStatus)) {
            result.status.push(cleanStatus);
          }
        });
      }
    }
    // DNSSEC
    else if (lowerLine.includes('dnssec:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const dnssecValue = parts.slice(1).join(':').trim().toLowerCase();
        result.dnssec = dnssecValue.includes('signed') || dnssecValue === 'yes' || dnssecValue === 'enabled';
      }
    }
    // 更新日期 - 扩展更多匹配模式
    else if (lowerLine.includes('updated date:') || lowerLine.includes('last updated:') || 
             lowerLine.includes('changed:') || lowerLine.includes('modified:') ||
             lowerLine.includes('last modified:') || lowerLine.includes('last changed:') ||
             lowerLine.includes('registry updated:') || lowerLine.includes('last update:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const updatedDate = formatDate(parts.slice(1).join(':').trim());
        if (updatedDate) {
          result.lastUpdated = updatedDate;
        }
      }
    }
    // 注册人信息
    else if (lowerLine.includes('registrant name:') || lowerLine.includes('registrant:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        result.registrant.name = parts.slice(1).join(':').trim();
      }
    }
    else if (lowerLine.includes('registrant organization:') || lowerLine.includes('registrant org:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        result.registrant.organization = parts.slice(1).join(':').trim();
      }
    }
    else if (lowerLine.includes('registrant email:') || lowerLine.includes('registrant e-mail:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        result.registrant.email = parts.slice(1).join(':').trim();
      }
    }
    else if (lowerLine.includes('registrant country:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        result.registrant.country = parts.slice(1).join(':').trim();
      }
    }
  }
  
  return result;
}

// 解析RDAP响应
function parseRDAPResponse(data: any): any {
  const domain = data.ldhName || data.unicodeName || '';
  const events = data.events || [];
  const entities = data.entities || [];
  const nameservers = data.nameservers || [];
  const status = data.status || [];

  // 提取日期
  const registrationDate = events.find((e: any) => e.eventAction === 'registration')?.eventDate;
  const expirationDate = events.find((e: any) => e.eventAction === 'expiration')?.eventDate;
  const lastUpdated = events.find((e: any) => e.eventAction === 'last changed')?.eventDate;

  // 提取注册商信息
  const registrarEntity = entities.find((e: any) => e.roles?.includes('registrar'));
  const registrar = registrarEntity?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] || 
                   registrarEntity?.publicIds?.[0]?.identifier || 'Unknown';

  // 提取注册人信息
  const registrantEntity = entities.find((e: any) => e.roles?.includes('registrant'));
  const registrant = registrantEntity ? {
    name: registrantEntity.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3],
    organization: registrantEntity.vcardArray?.[1]?.find((v: any) => v[0] === 'org')?.[3],
    country: registrantEntity.vcardArray?.[1]?.find((v: any) => v[0] === 'adr')?.[3]?.[6]
  } : undefined;

  return {
    domain,
    registrar,
    registrationDate: registrationDate ? formatDate(registrationDate) : null,
    expirationDate: expirationDate ? formatDate(expirationDate) : null,
    nameServers: nameservers.map((ns: any) => ns.ldhName).filter(Boolean),
    status: status,
    registrant,
    dnssec: data.secureDNS?.delegationSigned || false,
    lastUpdated: lastUpdated ? formatDate(lastUpdated) : `${new Date().getFullYear()}年${String(new Date().getMonth() + 1).padStart(2, '0')}月${String(new Date().getDate()).padStart(2, '0')}日`,
    source: 'rdap' as const
  };
}

// 解析WHOIS响应
function parseWHOISResponse(data: any, domain: string): any {
  console.log(`Parsing WHOIS response for ${domain}:`, JSON.stringify(data, null, 2));
  
  // 处理不同格式的WHOIS响应
  const whoisRecord = data.WhoisRecord || data.result || data;
  const registryData = whoisRecord.registryData || whoisRecord.registry || whoisRecord;
  const registrarData = whoisRecord.registrarData || whoisRecord.registrar || {};

  // 提取日期信息 - 扩展更多字段
  const createdDate = registryData.createdDate || registryData.created || registryData.creationDate || 
                     registryData.registrationDate || registrarData.createdDate || registrarData.created || 
                     data.createdDate || data.created || data.registrationDate;
                     
  const expirationDate = registryData.expiresDate || registryData.expires || registryData.expirationDate ||
                        registryData.expiryDate || registrarData.expiresDate || registrarData.expires || 
                        data.expirationDate || data.expires || data.expiryDate;
  
  const updatedDate = registryData.updatedDate || registryData.updated || registryData.lastUpdated ||
                     registrarData.updatedDate || registrarData.updated || data.updatedDate || data.updated;
  
  // 提取名称服务器 - 扩展更多格式
  let nameServers = [];
  if (registryData.nameServers?.hostNames) {
    nameServers = registryData.nameServers.hostNames;
  } else if (registryData.nameServers && Array.isArray(registryData.nameServers)) {
    nameServers = registryData.nameServers;
  } else if (registryData.dns && Array.isArray(registryData.dns)) {
    nameServers = registryData.dns;
  } else if (data.nameServers && Array.isArray(data.nameServers)) {
    nameServers = data.nameServers;
  } else if (data.dns && Array.isArray(data.dns)) {
    nameServers = data.dns;
  }

  // 提取状态信息 - 扩展更多格式
  let status = [];
  if (registryData.status && Array.isArray(registryData.status)) {
    status = registryData.status.map((s: string) => s.split(' ')[0]);
  } else if (data.status && Array.isArray(data.status)) {
    status = data.status.map((s: string) => s.split(' ')[0]);
  }

  return {
    domain: domain,
    registrar: registrarData.registrarName || registryData.registrarName || 
               registrarData.name || registryData.registrar || data.registrar || 'Unknown',
    registrationDate: createdDate ? formatDate(createdDate) : null,
    expirationDate: expirationDate ? formatDate(expirationDate) : null,
    nameServers: nameServers.filter(Boolean),
    status: status.filter(Boolean),
    registrant: (registryData.registrant || data.registrant) ? {
      name: registryData.registrant?.name || data.registrant?.name,
      organization: registryData.registrant?.organization || data.registrant?.organization,
      country: registryData.registrant?.country || data.registrant?.country
    } : undefined,
    dnssec: registryData.dnssec === 'signed' || registryData.dnssec === true || false,
    lastUpdated: updatedDate ? formatDate(updatedDate) : `${new Date().getFullYear()}年${String(new Date().getMonth() + 1).padStart(2, '0')}月${String(new Date().getDate()).padStart(2, '0')}日`,
    source: 'whois' as const
  };
}

// 格式化日期为中文年月日格式
function formatDate(dateStr: string): string {
  try {
    // 清理日期字符串，移除多余的信息
    const cleanDateStr = dateStr.replace(/\s*\(.*?\)/, '').replace(/\s*UTC.*/, '').trim();
    
    const date = new Date(cleanDateStr);
    if (isNaN(date.getTime())) {
      // 尝试解析其他格式
      const dateFormats = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/,  // YYYY-MM-DD
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/,   // MM-DD-YYYY
        /(\d{4})\/(\d{1,2})\/(\d{1,2})/  // YYYY/MM/DD
      ];
      
      for (const format of dateFormats) {
        const match = cleanDateStr.match(format);
        if (match) {
          let year, month, day;
          if (format.source.startsWith('(\\d{4})')) {
            // YYYY format
            [, year, month, day] = match;
          } else {
            // MM/DD format
            [, month, day, year] = match;
          }
          return `${year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日`;
        }
      }
      return cleanDateStr; // 如果无法解析，返回清理后的字符串
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  } catch {
    return dateStr;
  }
}

// 智能双系统查询
async function performDualLookup(domain: string): Promise<any> {
  const results: any = {};
  const errors: string[] = [];
  const tld = getTLD(domain);

  console.log(`Starting dual lookup for ${domain} (TLD: ${tld})`);

  // 并行执行RDAP和WHOIS查询以提高效率
  let rdapError = null;
  let whoisError = null;
  
  const rdapPromise = RDAP_SERVERS[tld] ? queryRDAP(domain).catch(error => {
    console.log(`RDAP failed for ${domain}:`, error.message);
    rdapError = error;
    errors.push(`RDAP: ${error.message}`);
    return null;
  }) : Promise.resolve(null);

  const whoisPromise = queryWHOIS(domain).catch(error => {
    console.log(`WHOIS failed for ${domain}:`, error.message);
    whoisError = error;
    errors.push(`WHOIS: ${error.message}`);
    return null;
  }) : Promise.resolve(null);

  // 等待两个查询完成
  const [rdapResult, whoisResult] = await Promise.all([rdapPromise, whoisPromise]);

  if (rdapResult) {
    results.primary = rdapResult;
    console.log(`RDAP lookup successful for ${domain}`);
  }

  if (whoisResult) {
    results.secondary = whoisResult;
    console.log(`WHOIS lookup successful for ${domain}`);
  }

  // 如果两个都失败了，进行详细的错误分析
  if (!results.primary && !results.secondary) {
    // 检查是否是不支持的TLD
    if (!RDAP_SERVERS[tld] && !WHOIS_SERVERS[tld]) {
      return {
        error: `不支持查询 .${tld} 域名后缀。该顶级域名暂未纳入查询服务范围。`,
        errorType: 'unsupported_tld'
      };
    }
    
    // 检查是否是域名未注册 - 更严格的判断
    if ((rdapError && rdapError.message === 'domain_not_found') ||
        (whoisError && whoisError.message === 'domain_not_found')) {
      return {
        error: `域名 ${domain} 未注册，该域名可供注册使用`,
        errorType: 'domain_not_found'
      };
    }

    // 检查是否是域名被保留 - 更严格的判断
    if ((rdapError && rdapError.message === 'domain_reserved') ||
        (whoisError && whoisError.message === 'domain_reserved')) {
      return {
        error: `域名 ${domain} 为保留域名，不可注册`,
        errorType: 'domain_reserved'
      };
    }
    
    // 检查是否是域名受限
    if ((rdapError && rdapError.message === 'domain_restricted') ||
        (whoisError && whoisError.message === 'domain_restricted') ||
        errors.some(e => e.includes('access denied') || e.includes('unauthorized'))) {
      return {
        error: `域名 ${domain} 为受限域名，需特殊申请`,
        errorType: 'domain_restricted'
      };
    }
    
    // 网络或服务器错误
    if (errors.some(e => e.includes('timeout') || e.includes('network') || e.includes('connection'))) {
      return {
        error: `网络连接超时，请稍后重试。可能是查询服务器暂时不可用。`,
        errorType: 'network_error'
      };
    }
    
    // 其他错误
    return {
      error: `查询失败：${errors.slice(0, 2).join('; ')}。请稍后重试或联系技术支持。`,
      errorType: 'query_failed',
      details: errors
    };
  }

  // 如果只有一个成功，记录原因
  if (results.primary && !results.secondary) {
    console.log(`Only RDAP succeeded for ${domain}. WHOIS errors: ${errors.filter(e => e.startsWith('WHOIS')).join(', ')}`);
  } else if (!results.primary && results.secondary) {
    console.log(`Only WHOIS succeeded for ${domain}. RDAP errors: ${errors.filter(e => e.startsWith('RDAP')).join(', ')}`);
  }

  // 增加完整的原始数据信息供调试使用
  results.metadata = {
    tld: tld,
    queryTimestamp: new Date().toISOString(),
    rdapSupported: !!RDAP_SERVERS[tld],
    whoisSupported: !!WHOIS_SERVERS[tld],
    rdapServer: RDAP_SERVERS[tld],
    whoisServer: WHOIS_SERVERS[tld],
    errors: errors,
    queryMethods: [
      results.primary ? `RDAP (${RDAP_SERVERS[tld]})` : null,
      results.secondary ? `HTTP WHOIS APIs` : null
    ].filter(Boolean)
  };

  return results;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: '域名参数不能为空' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 基本域名格式验证
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.trim())) {
      return new Response(
        JSON.stringify({ 
          error: '域名格式无效，请输入有效的域名格式，如：example.com',
          errorType: 'invalid_format'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing domain lookup for: ${domain}`);
    const result = await performDualLookup(domain.trim().toLowerCase());

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: '服务器内部错误，请稍后重试',
        errorType: 'server_error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
