import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 完整的WHOIS服务器列表 - 本地直连查询
const WHOIS_SERVERS: Record<string, { server: string; port: number; query?: string }> = {
  // 通用顶级域名 (gTLD)
  'com': { server: 'whois.verisign-grs.com', port: 43 },
  'net': { server: 'whois.verisign-grs.com', port: 43 },
  'org': { server: 'whois.pir.org', port: 43 },
  'info': { server: 'whois.afilias.net', port: 43 },
  'biz': { server: 'whois.biz', port: 43 },
  'name': { server: 'whois.nic.name', port: 43 },
  'mobi': { server: 'whois.afilias.net', port: 43 },
  'asia': { server: 'whois.nic.asia', port: 43 },
  'tel': { server: 'whois.nic.tel', port: 43 },
  'jobs': { server: 'whois.nic.jobs', port: 43 },
  'travel': { server: 'whois.nic.travel', port: 43 },
  'xxx': { server: 'whois.nic.xxx', port: 43 },
  'pro': { server: 'whois.registrypro.pro', port: 43 },
  'aero': { server: 'whois.aero', port: 43 },
  'coop': { server: 'whois.nic.coop', port: 43 },
  'museum': { server: 'whois.museum', port: 43 },
  
  // 新通用顶级域名 (New gTLDs)
  'app': { server: 'whois.nic.google', port: 43 },
  'dev': { server: 'whois.nic.google', port: 43 },
  'page': { server: 'whois.nic.google', port: 43 },
  'blog': { server: 'whois.nic.blog', port: 43 },
  'cloud': { server: 'whois.nic.cloud', port: 43 },
  'online': { server: 'whois.nic.online', port: 43 },
  'site': { server: 'whois.nic.site', port: 43 },
  'store': { server: 'whois.nic.store', port: 43 },
  'tech': { server: 'whois.nic.tech', port: 43 },
  'xyz': { server: 'whois.nic.xyz', port: 43 },
  'top': { server: 'whois.nic.top', port: 43 },
  'club': { server: 'whois.nic.club', port: 43 },
  'shop': { server: 'whois.nic.shop', port: 43 },
  'work': { server: 'whois.nic.work', port: 43 },
  'vip': { server: 'whois.nic.vip', port: 43 },
  'ltd': { server: 'whois.nic.ltd', port: 43 },
  'life': { server: 'whois.nic.life', port: 43 },
  'live': { server: 'whois.nic.live', port: 43 },
  'world': { server: 'whois.nic.world', port: 43 },
  'today': { server: 'whois.nic.today', port: 43 },
  'email': { server: 'whois.nic.email', port: 43 },
  'icu': { server: 'whois.nic.icu', port: 43 },
  'fun': { server: 'whois.nic.fun', port: 43 },
  'wang': { server: 'whois.gtld.knet.cn', port: 43 },
  'xin': { server: 'whois.gtld.knet.cn', port: 43 },
  
  // 国家/地区顶级域名 (ccTLD) - 亚洲
  'cn': { server: 'whois.cnnic.cn', port: 43 },
  'hk': { server: 'whois.hkirc.hk', port: 43 },
  'tw': { server: 'whois.twnic.net.tw', port: 43 },
  'jp': { server: 'whois.jprs.jp', port: 43, query: 'DOM ' },
  'kr': { server: 'whois.kr', port: 43 },
  'sg': { server: 'whois.sgnic.sg', port: 43 },
  'my': { server: 'whois.mynic.my', port: 43 },
  'th': { server: 'whois.thnic.co.th', port: 43 },
  'id': { server: 'whois.pandi.or.id', port: 43 },
  'ph': { server: 'whois.dot.ph', port: 43 },
  'vn': { server: 'whois.vnnic.vn', port: 43 },
  'in': { server: 'whois.registry.in', port: 43 },
  'ir': { server: 'whois.nic.ir', port: 43 },
  'ae': { server: 'whois.aeda.net.ae', port: 43 },
  'sa': { server: 'whois.nic.net.sa', port: 43 },
  'il': { server: 'whois.isoc.org.il', port: 43 },
  'pk': { server: 'whois.pknic.net.pk', port: 43 },
  'bd': { server: 'whois.btcl.net.bd', port: 43 },
  'np': { server: 'whois.mos.com.np', port: 43 },
  'lk': { server: 'whois.nic.lk', port: 43 },
  'kz': { server: 'whois.nic.kz', port: 43 },
  'uz': { server: 'whois.cctld.uz', port: 43 },
  'mn': { server: 'whois.nic.mn', port: 43 },
  
  // 国家/地区顶级域名 (ccTLD) - 欧洲
  'uk': { server: 'whois.nic.uk', port: 43 },
  'de': { server: 'whois.denic.de', port: 43, query: '-T dn,ace ' },
  'fr': { server: 'whois.nic.fr', port: 43 },
  'it': { server: 'whois.nic.it', port: 43 },
  'es': { server: 'whois.nic.es', port: 43 },
  'nl': { server: 'whois.domain-registry.nl', port: 43 },
  'be': { server: 'whois.dns.be', port: 43 },
  'at': { server: 'whois.nic.at', port: 43 },
  'ch': { server: 'whois.nic.ch', port: 43 },
  'pl': { server: 'whois.dns.pl', port: 43 },
  'ru': { server: 'whois.tcinet.ru', port: 43 },
  'ua': { server: 'whois.ua', port: 43 },
  'cz': { server: 'whois.nic.cz', port: 43 },
  'sk': { server: 'whois.sk-nic.sk', port: 43 },
  'hu': { server: 'whois.nic.hu', port: 43 },
  'ro': { server: 'whois.rotld.ro', port: 43 },
  'bg': { server: 'whois.register.bg', port: 43 },
  'hr': { server: 'whois.dns.hr', port: 43 },
  'rs': { server: 'whois.rnids.rs', port: 43 },
  'si': { server: 'whois.register.si', port: 43 },
  'gr': { server: 'whois.ics.forth.gr', port: 43 },
  'pt': { server: 'whois.dns.pt', port: 43 },
  'ie': { server: 'whois.iedr.ie', port: 43 },
  'se': { server: 'whois.iis.se', port: 43 },
  'no': { server: 'whois.norid.no', port: 43 },
  'dk': { server: 'whois.dk-hostmaster.dk', port: 43 },
  'fi': { server: 'whois.fi', port: 43 },
  'ee': { server: 'whois.tld.ee', port: 43 },
  'lv': { server: 'whois.nic.lv', port: 43 },
  'lt': { server: 'whois.domreg.lt', port: 43 },
  'by': { server: 'whois.cctld.by', port: 43 },
  'md': { server: 'whois.nic.md', port: 43 },
  'is': { server: 'whois.isnic.is', port: 43 },
  'lu': { server: 'whois.dns.lu', port: 43 },
  'li': { server: 'whois.nic.li', port: 43 },
  'mc': { server: 'whois.nic.mc', port: 43 },
  
  // 国家/地区顶级域名 (ccTLD) - 美洲
  'us': { server: 'whois.nic.us', port: 43 },
  'ca': { server: 'whois.cira.ca', port: 43 },
  'mx': { server: 'whois.mx', port: 43 },
  'br': { server: 'whois.registro.br', port: 43 },
  'ar': { server: 'whois.nic.ar', port: 43 },
  'cl': { server: 'whois.nic.cl', port: 43 },
  'co': { server: 'whois.nic.co', port: 43 },
  'pe': { server: 'kero.yachay.pe', port: 43 },
  've': { server: 'whois.nic.ve', port: 43 },
  'ec': { server: 'whois.nic.ec', port: 43 },
  'uy': { server: 'whois.nic.org.uy', port: 43 },
  'py': { server: 'whois.nic.py', port: 43 },
  'bo': { server: 'whois.nic.bo', port: 43 },
  'pa': { server: 'whois.nic.pa', port: 43 },
  'cr': { server: 'whois.nic.cr', port: 43 },
  'gt': { server: 'whois.gt', port: 43 },
  'hn': { server: 'whois.nic.hn', port: 43 },
  'sv': { server: 'whois.svnet.org.sv', port: 43 },
  'ni': { server: 'whois.nic.ni', port: 43 },
  'do': { server: 'whois.nic.do', port: 43 },
  'pr': { server: 'whois.nic.pr', port: 43 },
  'jm': { server: 'whois.nic.jm', port: 43 },
  'tt': { server: 'whois.nic.tt', port: 43 },
  'aw': { server: 'whois.nic.aw', port: 43 },
  
  // 国家/地区顶级域名 (ccTLD) - 大洋洲
  'au': { server: 'whois.auda.org.au', port: 43 },
  'nz': { server: 'whois.srs.net.nz', port: 43 },
  'fj': { server: 'whois.nic.fj', port: 43 },
  'ws': { server: 'whois.website.ws', port: 43 },
  'to': { server: 'whois.tonic.to', port: 43 },
  'tv': { server: 'whois.nic.tv', port: 43 },
  'nu': { server: 'whois.iis.nu', port: 43 },
  'ck': { server: 'whois.ck-nic.org.ck', port: 43 },
  'ki': { server: 'whois.nic.ki', port: 43 },
  'sb': { server: 'whois.nic.net.sb', port: 43 },
  'vu': { server: 'whois.nic.vu', port: 43 },
  'pw': { server: 'whois.nic.pw', port: 43 },
  'fm': { server: 'whois.nic.fm', port: 43 },
  
  // 国家/地区顶级域名 (ccTLD) - 非洲
  'za': { server: 'whois.registry.net.za', port: 43 },
  'ng': { server: 'whois.nic.net.ng', port: 43 },
  'ke': { server: 'whois.kenic.or.ke', port: 43 },
  'eg': { server: 'whois.ripe.net', port: 43 },
  'ma': { server: 'whois.registre.ma', port: 43 },
  'tn': { server: 'whois.ati.tn', port: 43 },
  'gh': { server: 'whois.nic.gh', port: 43 },
  'ug': { server: 'whois.co.ug', port: 43 },
  'tz': { server: 'whois.nic.tz', port: 43 },
  'rw': { server: 'whois.nic.rw', port: 43 },
  'et': { server: 'whois.nic.et', port: 43 },
  'na': { server: 'whois.na-nic.com.na', port: 43 },
  'bw': { server: 'whois.nic.net.bw', port: 43 },
  'mw': { server: 'whois.nic.mw', port: 43 },
  'zm': { server: 'whois.nic.zm', port: 43 },
  'mu': { server: 'whois.nic.mu', port: 43 },
  're': { server: 'whois.nic.re', port: 43 },
  'mg': { server: 'whois.nic.mg', port: 43 },
  'sc': { server: 'whois2.afilias-grs.net', port: 43 },
  'sn': { server: 'whois.nic.sn', port: 43 },
  'ci': { server: 'whois.nic.ci', port: 43 },
  'cm': { server: 'whois.netcom.cm', port: 43 },
  'bf': { server: 'whois.nic.bf', port: 43 },
  'ml': { server: 'whois.nic.ml', port: 43 },
  'tg': { server: 'whois.nic.tg', port: 43 },
  'bj': { server: 'whois.nic.bj', port: 43 },
  'ne': { server: 'whois.nic.ne', port: 43 },
  'gn': { server: 'whois.nic.gn', port: 43 },
  'lr': { server: 'whois.nic.lr', port: 43 },
  'sl': { server: 'whois.nic.sl', port: 43 },
  'gm': { server: 'whois.nic.gm', port: 43 },
  'gw': { server: 'whois.nic.gw', port: 43 },
  'cv': { server: 'whois.nic.cv', port: 43 },
  'mr': { server: 'whois.nic.mr', port: 43 },
  'st': { server: 'whois.nic.st', port: 43 },
  'ao': { server: 'whois.nic.ao', port: 43 },
  'cd': { server: 'whois.nic.cd', port: 43 },
  'cg': { server: 'whois.nic.cg', port: 43 },
  'ga': { server: 'whois.nic.ga', port: 43 },
  'gq': { server: 'whois.nic.gq', port: 43 },
  'td': { server: 'whois.nic.td', port: 43 },
  'cf': { server: 'whois.nic.cf', port: 43 },
  'bi': { server: 'whois1.nic.bi', port: 43 },
  'dj': { server: 'whois.nic.dj', port: 43 },
  'er': { server: 'whois.nic.er', port: 43 },
  'so': { server: 'whois.nic.so', port: 43 },
  'km': { server: 'whois.nic.km', port: 43 },
  'yt': { server: 'whois.nic.yt', port: 43 },
  'mz': { server: 'whois.nic.mz', port: 43 },
  'zw': { server: 'whois.nic.zw', port: 43 },
  'sz': { server: 'whois.nic.sz', port: 43 },
  'ls': { server: 'whois.nic.ls', port: 43 },
  
  // 特殊用途域名
  'cc': { server: 'whois.nic.cc', port: 43 },
  'me': { server: 'whois.nic.me', port: 43 },
  'io': { server: 'whois.nic.io', port: 43 },
  'la': { server: 'whois.nic.la', port: 43 },
  'ly': { server: 'whois.nic.ly', port: 43 },
  'af': { server: 'whois.nic.af', port: 43 },
  'ai': { server: 'whois.nic.ai', port: 43 },
  'gg': { server: 'whois.gg', port: 43 },
  'je': { server: 'whois.je', port: 43 },
  'im': { server: 'whois.nic.im', port: 43 },
  'sh': { server: 'whois.nic.sh', port: 43 },
  'ac': { server: 'whois.nic.ac', port: 43 },
  'sx': { server: 'whois.sx', port: 43 },
  'gs': { server: 'whois.nic.gs', port: 43 },
  'ms': { server: 'whois.nic.ms', port: 43 },
  'tc': { server: 'whois.nic.tc', port: 43 },
  'vg': { server: 'whois.nic.vg', port: 43 },
  'bz': { server: 'whois.afilias-grs.info', port: 43 },
  'vc': { server: 'whois2.afilias-grs.net', port: 43 },
  'lc': { server: 'whois2.afilias-grs.net', port: 43 },
  'ag': { server: 'whois.nic.ag', port: 43 },
  'dm': { server: 'whois.nic.dm', port: 43 },
  'gd': { server: 'whois.nic.gd', port: 43 },
  'kn': { server: 'whois.nic.kn', port: 43 },
  'ky': { server: 'whois.kyregistry.ky', port: 43 },
  'bb': { server: 'whois.telecoms.gov.bb', port: 43 },
  'bs': { server: 'whois.nic.bs', port: 43 },
  'ht': { server: 'whois.nic.ht', port: 43 },
  'cu': { server: 'whois.nic.cu', port: 43 },
  'gl': { server: 'whois.nic.gl', port: 43 },
  'pm': { server: 'whois.nic.pm', port: 43 },
  'wf': { server: 'whois.nic.wf', port: 43 },
  'mq': { server: 'whois.mediaserv.net', port: 43 },
  'gp': { server: 'whois.nic.gp', port: 43 },
  'gf': { server: 'whois.mediaserv.net', port: 43 },
  'nc': { server: 'whois.nc', port: 43 },
  'pf': { server: 'whois.registry.pf', port: 43 },
  'tf': { server: 'whois.nic.tf', port: 43 },
  'bn': { server: 'whois.bnnic.bn', port: 43 },
  'bt': { server: 'whois.nic.bt', port: 43 },
  'mm': { server: 'whois.nic.mm', port: 43 },
  'la': { server: 'whois.nic.la', port: 43 },
  'kh': { server: 'whois.nic.kh', port: 43 },
  'mo': { server: 'whois.monic.mo', port: 43 },
  'tl': { server: 'whois.nic.tl', port: 43 },
  'mv': { server: 'whois.nic.mv', port: 43 },
  'af': { server: 'whois.nic.af', port: 43 },
  'tm': { server: 'whois.nic.tm', port: 43 },
  'tj': { server: 'whois.nic.tj', port: 43 },
  'kg': { server: 'whois.kg', port: 43 },
  'am': { server: 'whois.amnic.net', port: 43 },
  'ge': { server: 'whois.nic.ge', port: 43 },
  'az': { server: 'whois.az', port: 43 },
  'cy': { server: 'whois.nic.cy', port: 43 },
  'tr': { server: 'whois.nic.tr', port: 43 },
  'lb': { server: 'whois.lbdr.org.lb', port: 43 },
  'sy': { server: 'whois.tld.sy', port: 43 },
  'jo': { server: 'whois.nic.jo', port: 43 },
  'iq': { server: 'whois.nic.iq', port: 43 },
  'kw': { server: 'whois.nic.kw', port: 43 },
  'bh': { server: 'whois.nic.bh', port: 43 },
  'qa': { server: 'whois.nic.qa', port: 43 },
  'om': { server: 'whois.nic.om', port: 43 },
  'ye': { server: 'whois.nic.ye', port: 43 },
  'ps': { server: 'whois.nic.ps', port: 43 },
};

// RDAP服务器列表
const RDAP_SERVERS: Record<string, string> = {
  'com': 'https://rdap.verisign.com/com/v1',
  'net': 'https://rdap.verisign.com/net/v1',
  'org': 'https://rdap.publicinterestregistry.org',
  'info': 'https://rdap.afilias.net/rdap/afilias',
  'biz': 'https://rdap.afilias.net/rdap/afilias',
  'us': 'https://rdap.nic.us',
  'uk': 'https://rdap.nominet.uk',
  'de': 'https://rdap.denic.de',
  'fr': 'https://rdap.nic.fr',
  'it': 'https://rdap.nic.it',
  'be': 'https://rdap.dns.be',
  'ch': 'https://rdap.nic.ch',
  'at': 'https://rdap.nic.at',
  'es': 'https://rdap.nic.es',
  'au': 'https://rdap.nic.au',
  'ca': 'https://rdap.ca',
  'jp': 'https://rdap.jprs.jp',
  'cc': 'https://rdap.nic.cc',
  'tv': 'https://rdap.nic.tv',
  'me': 'https://rdap.nic.me',
  'co': 'https://rdap.nic.co',
  'io': 'https://rdap.nic.io',
  'af': 'https://rdap.nic.af',
  'ke': 'https://rdap.kenic.or.ke',
  'app': 'https://rdap.nic.google',
  'dev': 'https://rdap.nic.google',
  'page': 'https://rdap.nic.google',
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
    if (tld === 'cn' && ['com', 'net', 'org', 'gov', 'edu', 'ac'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    
    return tld;
  }
  return '';
}

// 直接TCP连接WHOIS服务器查询
async function queryWhoisDirect(domain: string): Promise<string> {
  const tld = getTLD(domain);
  const serverInfo = WHOIS_SERVERS[tld];
  
  if (!serverInfo) {
    throw new Error(`No WHOIS server found for .${tld} domains`);
  }
  
  console.log(`Connecting to WHOIS server: ${serverInfo.server}:${serverInfo.port} for ${domain}`);
  
  try {
    // 使用Deno的TCP连接
    const conn = await Deno.connect({
      hostname: serverInfo.server,
      port: serverInfo.port,
    });
    
    // 构建查询字符串
    const queryPrefix = serverInfo.query || '';
    const queryString = `${queryPrefix}${domain}\r\n`;
    
    console.log(`Sending WHOIS query: ${queryString.trim()}`);
    
    // 发送查询
    const encoder = new TextEncoder();
    await conn.write(encoder.encode(queryString));
    
    // 读取响应
    const decoder = new TextDecoder();
    const chunks: Uint8Array[] = [];
    const buffer = new Uint8Array(4096);
    
    // 设置超时
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('WHOIS query timeout')), 15000);
    });
    
    const readPromise = (async () => {
      try {
        while (true) {
          const n = await conn.read(buffer);
          if (n === null) break;
          chunks.push(buffer.slice(0, n));
        }
      } finally {
        conn.close();
      }
    })();
    
    await Promise.race([readPromise, timeoutPromise]);
    
    // 合并所有chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    const responseText = decoder.decode(result);
    console.log(`WHOIS response received, length: ${responseText.length}`);
    
    return responseText;
  } catch (error) {
    console.error(`Direct WHOIS query failed for ${domain}:`, error.message);
    throw error;
  }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${rdapServer}/domain/${domain}`, {
      headers: {
        'Accept': 'application/rdap+json',
        'User-Agent': 'DomainLookup/1.0'
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

// 解析RDAP响应
function parseRDAPResponse(data: any): any {
  const domain = data.ldhName || data.unicodeName || '';
  const events = data.events || [];
  const entities = data.entities || [];
  const nameservers = data.nameservers || [];
  const status = data.status || [];

  const registrationDate = events.find((e: any) => e.eventAction === 'registration')?.eventDate;
  const expirationDate = events.find((e: any) => e.eventAction === 'expiration')?.eventDate;
  const lastUpdated = events.find((e: any) => e.eventAction === 'last changed')?.eventDate;

  const registrarEntity = entities.find((e: any) => e.roles?.includes('registrar'));
  const registrar = registrarEntity?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] || 
                   registrarEntity?.publicIds?.[0]?.identifier || 'Unknown';

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
    lastUpdated: lastUpdated ? formatDate(lastUpdated) : formatDate(new Date().toISOString()),
    source: 'rdap' as const
  };
}

// 解析WHOIS文本响应
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
    lastUpdated: formatDate(new Date().toISOString()),
    source: 'whois' as const,
    registrant: {}
  };
  
  const textLower = text.toLowerCase();
  
  // 检查域名未注册
  const notFoundIndicators = [
    'no match for domain', 'not found', 'no data found',
    'domain is not registered', 'available for registration', 'status: free',
    'status: available', 'no entries found', 'nothing found',
    'object does not exist', 'domain not found', 'no object found',
    'the queried object does not exist', 'not been registered'
  ];
  
  // 首先检查是否有注册信息
  let hasRegistrarInfo = false;
  let hasValidDates = false;
  let hasNameServers = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();
    if ((lowerLine.includes('registrar:') || lowerLine.includes('sponsoring registrar:')) && !lowerLine.includes('not available')) {
      hasRegistrarInfo = true;
    }
    if (lowerLine.includes('creation date:') || lowerLine.includes('created:') || 
        lowerLine.includes('registration time:') || lowerLine.includes('registered on:')) {
      hasValidDates = true;
    }
    if (lowerLine.includes('name server:') || lowerLine.includes('nserver:') || lowerLine.includes('dns:')) {
      hasNameServers = true;
    }
  }
  
  // 只有在没有注册信息时才判断为未注册
  if (!hasRegistrarInfo && !hasValidDates && !hasNameServers) {
    if (notFoundIndicators.some(indicator => textLower.includes(indicator))) {
      throw new Error('domain_not_found');
    }
  }
  
  for (const line of lines) {
    const trimmed = line.trim();
    const lowerLine = trimmed.toLowerCase();
    
    // 注册商信息
    if (lowerLine.includes('registrar:') || lowerLine.includes('sponsoring registrar:') || 
        lowerLine.includes('registrar name:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const registrarValue = parts.slice(1).join(':').trim();
        if (registrarValue && registrarValue !== 'Unknown' && registrarValue !== '-') {
          result.registrar = registrarValue;
        }
      }
    }
    // 创建日期
    else if (lowerLine.includes('creation date:') || lowerLine.includes('created:') || 
             lowerLine.includes('created on:') || lowerLine.includes('registration time:') ||
             lowerLine.includes('registered on:') || lowerLine.includes('registration date:') ||
             lowerLine.includes('domain registered:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const dateValue = parts.slice(1).join(':').trim();
        if (dateValue && dateValue !== '-') {
          result.registrationDate = formatDate(dateValue);
        }
      }
    }
    // 到期日期
    else if (lowerLine.includes('expiry date:') || lowerLine.includes('expires:') || 
             lowerLine.includes('expiration date:') || lowerLine.includes('expires on:') || 
             lowerLine.includes('expiration time:') || lowerLine.includes('registry expiry date:') ||
             lowerLine.includes('paid-till:') || lowerLine.includes('expire date:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const dateValue = parts.slice(1).join(':').trim();
        if (dateValue && dateValue !== '-') {
          result.expirationDate = formatDate(dateValue);
        }
      }
    }
    // DNS服务器
    else if (lowerLine.includes('name server:') || lowerLine.includes('nserver:') || 
             lowerLine.includes('nameserver:') || lowerLine.startsWith('dns:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const ns = parts.slice(1).join(':').trim().toLowerCase();
        const cleanNs = ns.split(' ')[0].trim();
        if (cleanNs && cleanNs !== '-' && cleanNs !== 'not available' && 
            !result.nameServers.includes(cleanNs) && cleanNs.includes('.')) {
          result.nameServers.push(cleanNs);
        }
      }
    }
    // 域名状态
    else if (lowerLine.includes('domain status:') || lowerLine.startsWith('status:') || lowerLine.includes('domain state:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const statusText = parts.slice(1).join(':').trim();
        const statuses = statusText.split(/[,;\s]+/).filter(s => s.length > 0);
        statuses.forEach(status => {
          const cleanStatus = status.split(' ')[0].replace(/https?:\/\/.*/, '').trim();
          if (cleanStatus && !result.status.includes(cleanStatus) && cleanStatus.length > 1) {
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
    // 更新日期
    else if (lowerLine.includes('updated date:') || lowerLine.includes('last updated:') || 
             lowerLine.includes('changed:') || lowerLine.includes('modified:') ||
             lowerLine.includes('last modified:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const updatedDate = formatDate(parts.slice(1).join(':').trim());
        if (updatedDate) {
          result.lastUpdated = updatedDate;
        }
      }
    }
    // 注册人信息
    else if (lowerLine.includes('registrant name:') || lowerLine.startsWith('registrant:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const value = parts.slice(1).join(':').trim();
        if (value && value !== '-') {
          result.registrant.name = value;
        }
      }
    }
    else if (lowerLine.includes('registrant organization:') || lowerLine.includes('registrant org:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const value = parts.slice(1).join(':').trim();
        if (value && value !== '-') {
          result.registrant.organization = value;
        }
      }
    }
    else if (lowerLine.includes('registrant country:')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        const value = parts.slice(1).join(':').trim();
        if (value && value !== '-') {
          result.registrant.country = value;
        }
      }
    }
  }
  
  return result;
}

// 格式化日期为中文年月日格式
function formatDate(dateStr: string): string {
  try {
    const cleanDateStr = dateStr.replace(/\s*\(.*?\)/, '').replace(/\s*UTC.*/, '').replace(/T.*/, ' ').trim();
    
    const date = new Date(cleanDateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}年${month}月${day}日`;
    }
    
    // 尝试解析其他格式
    const dateFormats = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{4})\.(\d{1,2})\.(\d{1,2})/,
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
    ];
    
    for (const format of dateFormats) {
      const match = cleanDateStr.match(format);
      if (match) {
        let year, month, day;
        if (format.source.startsWith('(\\d{4})')) {
          [, year, month, day] = match;
        } else {
          [, month, day, year] = match;
        }
        return `${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;
      }
    }
    
    return cleanDateStr;
  } catch {
    return dateStr;
  }
}

// 执行域名查询 - RDAP优先，WHOIS兜底
async function performDualLookup(domain: string): Promise<any> {
  const results: any = {};
  const errors: string[] = [];
  const tld = getTLD(domain);

  console.log(`Starting lookup for ${domain} (TLD: ${tld})`);

  // 1. 首先尝试RDAP查询（如果支持）
  if (RDAP_SERVERS[tld]) {
    try {
      console.log(`Attempting RDAP query for ${domain}`);
      const rdapResult = await queryRDAP(domain);
      if (rdapResult) {
        results.primary = rdapResult;
        console.log(`RDAP lookup successful for ${domain}`);
      }
    } catch (error) {
      console.log(`RDAP failed for ${domain}: ${error.message}`);
      errors.push(`RDAP: ${error.message}`);
      
      // 如果RDAP返回域名未找到，直接返回
      if (error.message === 'domain_not_found') {
        return {
          error: `域名 ${domain} 未注册，该域名可供注册使用`,
          errorType: 'domain_not_found'
        };
      }
    }
  } else {
    console.log(`RDAP not available for .${tld}, skipping`);
  }

  // 2. 如果RDAP失败或不支持，使用WHOIS直连查询
  if (!results.primary) {
    if (WHOIS_SERVERS[tld]) {
      try {
        console.log(`Attempting direct WHOIS query for ${domain}`);
        const whoisText = await queryWhoisDirect(domain);
        
        // 检查域名是否未注册 - 短响应或包含未注册标识
        const textLower = whoisText.toLowerCase();
        const notFoundIndicators = [
          'no matching record', 'no match', 'not found', 'no data found',
          'domain is not registered', 'available for registration', 
          'status: free', 'status: available', 'no entries found',
          'no object found', 'object does not exist', 'not been registered',
          'domain name has not been registered', 'the domain has not been registered'
        ];
        
        const isNotRegistered = whoisText.length < 100 || 
          notFoundIndicators.some(indicator => textLower.includes(indicator));
        
        if (isNotRegistered && !textLower.includes('registrar:') && 
            !textLower.includes('name server:') && !textLower.includes('creation date:')) {
          return {
            error: `域名 ${domain} 未注册，该域名可供注册使用`,
            errorType: 'domain_not_found'
          };
        }
        
        if (whoisText && whoisText.length > 20) {
          const whoisResult = parseWhoisText(whoisText, domain);
          if (whoisResult && (whoisResult.registrar !== 'Unknown' || 
              whoisResult.registrationDate || whoisResult.nameServers.length > 0)) {
            results.primary = whoisResult;
            console.log(`WHOIS lookup successful for ${domain}`);
          } else {
            // 解析成功但没有有效数据，判断为未注册
            return {
              error: `域名 ${domain} 未注册，该域名可供注册使用`,
              errorType: 'domain_not_found'
            };
          }
        } else {
          // 响应太短，判断为未注册
          return {
            error: `域名 ${domain} 未注册，该域名可供注册使用`,
            errorType: 'domain_not_found'
          };
        }
      } catch (error) {
        console.log(`Direct WHOIS failed for ${domain}: ${error.message}`);
        errors.push(`WHOIS: ${error.message}`);
        
        if (error.message === 'domain_not_found') {
          return {
            error: `域名 ${domain} 未注册，该域名可供注册使用`,
            errorType: 'domain_not_found'
          };
        }
      }
    } else {
      console.log(`No WHOIS server found for .${tld}`);
      errors.push(`WHOIS: 不支持查询 .${tld} 后缀`);
    }
  }

  // 3. 如果都失败了，返回错误
  if (!results.primary) {
    if (!RDAP_SERVERS[tld] && !WHOIS_SERVERS[tld]) {
      return {
        error: `不支持查询 .${tld} 域名后缀。该顶级域名暂未纳入查询服务范围。`,
        errorType: 'unsupported_tld'
      };
    }
    
    if (errors.some(e => e.includes('timeout') || e.includes('connection'))) {
      return {
        error: `网络连接超时，请稍后重试`,
        errorType: 'network_error'
      };
    }
    
    // 提供更清晰的错误信息
    const errorMessage = errors.length > 0 
      ? `查询失败：${errors.map(e => e.split(': ')[1] || e).filter(Boolean).join('，')}` 
      : `查询失败：未能获取域名信息`;
    
    return {
      error: errorMessage,
      errorType: 'query_failed',
      details: errors
    };
  }

  // 添加元数据
  results.metadata = {
    tld: tld,
    queryTimestamp: new Date().toISOString(),
    rdapSupported: !!RDAP_SERVERS[tld],
    whoisSupported: !!WHOIS_SERVERS[tld],
    rdapServer: RDAP_SERVERS[tld],
    whoisServer: WHOIS_SERVERS[tld]?.server,
    errors: errors,
    queryMethods: [results.primary?.source === 'rdap' ? `RDAP` : `WHOIS Direct (${WHOIS_SERVERS[tld]?.server})`]
  };

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: '域名参数不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.trim())) {
      return new Response(
        JSON.stringify({ 
          error: '域名格式无效，请输入有效的域名格式，如：example.com',
          errorType: 'invalid_format'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing domain lookup for: ${domain}`);
    const result = await performDualLookup(domain.trim().toLowerCase());

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: '服务器内部错误，请稍后重试',
        errorType: 'server_error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
