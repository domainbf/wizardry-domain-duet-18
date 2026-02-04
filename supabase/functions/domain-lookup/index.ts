import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== IDN / Punycode 支持 ====================
function punyEncode(input: string): string {
  const base = 36;
  const tMin = 1;
  const tMax = 26;
  const skew = 38;
  const damp = 700;
  const initialBias = 72;
  const initialN = 128;
  const delimiter = '-';
  
  let n = initialN;
  let delta = 0;
  let bias = initialBias;
  let output = '';
  
  const basicChars: string[] = [];
  const nonBasicChars: number[] = [];
  
  for (const char of input) {
    const code = char.charCodeAt(0);
    if (code < 128) {
      basicChars.push(char);
    } else {
      nonBasicChars.push(code);
    }
  }
  
  output = basicChars.join('');
  let handledCount = basicChars.length;
  const inputLength = [...input].length;
  
  if (handledCount > 0 && handledCount < inputLength) {
    output += delimiter;
  }
  
  if (handledCount === inputLength) {
    return output;
  }
  
  const allCodePoints = [...input].map(c => c.charCodeAt(0)).filter(cp => cp >= 128);
  const uniqueCodePoints = [...new Set(allCodePoints)].sort((a, b) => a - b);
  
  function adapt(delta: number, numPoints: number, firstTime: boolean): number {
    delta = firstTime ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
    while (delta > ((base - tMin) * tMax) >> 1) {
      delta = Math.floor(delta / (base - tMin));
      k += base;
    }
    return k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
  }
  
  function encodeDigit(d: number): string {
    return String.fromCharCode(d + (d < 26 ? 97 : 22));
  }
  
  for (const m of uniqueCodePoints) {
    if (m < n) continue;
    
    delta += (m - n) * (handledCount + 1);
    n = m;
    
    for (const char of input) {
      const code = char.charCodeAt(0);
      if (code < n) {
        delta++;
      } else if (code === n) {
        let q = delta;
        for (let k = base; ; k += base) {
          const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
          if (q < t) break;
          output += encodeDigit(t + ((q - t) % (base - t)));
          q = Math.floor((q - t) / (base - t));
        }
        output += encodeDigit(q);
        bias = adapt(delta, handledCount + 1, handledCount === basicChars.length);
        delta = 0;
        handledCount++;
      }
    }
    delta++;
    n++;
  }
  
  return output;
}

function toASCII(domain: string): string {
  const parts = domain.split('.');
  const result: string[] = [];
  
  for (const part of parts) {
    if (/[^\x00-\x7F]/.test(part)) {
      result.push('xn--' + punyEncode(part));
    } else {
      result.push(part);
    }
  }
  
  return result.join('.');
}

function isIDN(domain: string): boolean {
  return /[^\x00-\x7F]/.test(domain) || domain.includes('xn--');
}

// ==================== 完整的WHOIS服务器列表（全球覆盖） ====================
const WHOIS_SERVERS: Record<string, { server: string; port: number; query?: string; encoding?: string }> = {
  // =============== 通用顶级域名 (gTLD) ===============
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
  'cat': { server: 'whois.nic.cat', port: 43 },
  'post': { server: 'whois.dotpostregistry.net', port: 43 },
  
  // =============== 新通用顶级域名 (New gTLDs) ===============
  'app': { server: 'whois.nic.google', port: 43 },
  'dev': { server: 'whois.nic.google', port: 43 },
  'page': { server: 'whois.nic.google', port: 43 },
  'how': { server: 'whois.nic.google', port: 43 },
  'new': { server: 'whois.nic.google', port: 43 },
  'dad': { server: 'whois.nic.google', port: 43 },
  'day': { server: 'whois.nic.google', port: 43 },
  'foo': { server: 'whois.nic.google', port: 43 },
  'meme': { server: 'whois.nic.google', port: 43 },
  'mov': { server: 'whois.nic.google', port: 43 },
  'nexus': { server: 'whois.nic.google', port: 43 },
  'phd': { server: 'whois.nic.google', port: 43 },
  'prof': { server: 'whois.nic.google', port: 43 },
  'rsvp': { server: 'whois.nic.google', port: 43 },
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
  'link': { server: 'whois.uniregistry.net', port: 43 },
  'click': { server: 'whois.uniregistry.net', port: 43 },
  'help': { server: 'whois.uniregistry.net', port: 43 },
  'photo': { server: 'whois.uniregistry.net', port: 43 },
  'gift': { server: 'whois.uniregistry.net', port: 43 },
  'pics': { server: 'whois.uniregistry.net', port: 43 },
  'lol': { server: 'whois.uniregistry.net', port: 43 },
  'mom': { server: 'whois.uniregistry.net', port: 43 },
  'fans': { server: 'whois.nic.fans', port: 43 },
  'game': { server: 'whois.nic.game', port: 43 },
  'games': { server: 'whois.nic.games', port: 43 },
  'art': { server: 'whois.nic.art', port: 43 },
  'design': { server: 'whois.nic.design', port: 43 },
  'studio': { server: 'whois.nic.studio', port: 43 },
  'agency': { server: 'whois.nic.agency', port: 43 },
  'company': { server: 'whois.nic.company', port: 43 },
  'digital': { server: 'whois.nic.digital', port: 43 },
  'group': { server: 'whois.nic.group', port: 43 },
  'media': { server: 'whois.nic.media', port: 43 },
  'network': { server: 'whois.nic.network', port: 43 },
  'solutions': { server: 'whois.nic.solutions', port: 43 },
  'systems': { server: 'whois.nic.systems', port: 43 },
  'technology': { server: 'whois.nic.technology', port: 43 },
  'zone': { server: 'whois.nic.zone', port: 43 },
  'center': { server: 'whois.nic.center', port: 43 },
  'city': { server: 'whois.nic.city', port: 43 },
  'global': { server: 'whois.nic.global', port: 43 },
  'international': { server: 'whois.nic.international', port: 43 },
  'plus': { server: 'whois.nic.plus', port: 43 },
  'space': { server: 'whois.nic.space', port: 43 },
  'website': { server: 'whois.nic.website', port: 43 },
  'io': { server: 'whois.nic.io', port: 43 },
  'ai': { server: 'whois.nic.ai', port: 43 },
  'cc': { server: 'ccwhois.verisign-grs.com', port: 43 },
  'co': { server: 'whois.nic.co', port: 43 },
  'me': { server: 'whois.nic.me', port: 43 },
  'tv': { server: 'tvwhois.verisign-grs.com', port: 43 },
  
  // =============== 中文顶级域名 ===============
  '中国': { server: 'whois.cnnic.cn', port: 43, encoding: 'utf-8' },
  '中國': { server: 'whois.cnnic.cn', port: 43, encoding: 'utf-8' },
  '公司': { server: 'whois.ngtld.cn', port: 43, encoding: 'utf-8' },
  '网络': { server: 'whois.ngtld.cn', port: 43, encoding: 'utf-8' },
  '網絡': { server: 'whois.ngtld.cn', port: 43, encoding: 'utf-8' },
  '网址': { server: 'whois.knet.cn', port: 43, encoding: 'utf-8' },
  '网店': { server: 'whois.knet.cn', port: 43, encoding: 'utf-8' },
  '商店': { server: 'whois.knet.cn', port: 43, encoding: 'utf-8' },
  '商城': { server: 'whois.gtld.knet.cn', port: 43, encoding: 'utf-8' },
  '移动': { server: 'whois.nic.xn--6frz82g', port: 43, encoding: 'utf-8' },
  '我爱你': { server: 'whois.gtld.knet.cn', port: 43, encoding: 'utf-8' },
  '集团': { server: 'whois.gtld.knet.cn', port: 43, encoding: 'utf-8' },
  '在线': { server: 'whois.teleinfo.cn', port: 43, encoding: 'utf-8' },
  '游戏': { server: 'whois.teleinfo.cn', port: 43, encoding: 'utf-8' },
  '娱乐': { server: 'whois.teleinfo.cn', port: 43, encoding: 'utf-8' },
  '企业': { server: 'whois.teleinfo.cn', port: 43, encoding: 'utf-8' },
  '信息': { server: 'whois.teleinfo.cn', port: 43, encoding: 'utf-8' },
  '广东': { server: 'whois.ngtld.cn', port: 43, encoding: 'utf-8' },
  '佛山': { server: 'whois.ngtld.cn', port: 43, encoding: 'utf-8' },
  '香港': { server: 'whois.hkirc.hk', port: 43, encoding: 'utf-8' },
  '台湾': { server: 'whois.twnic.net.tw', port: 43, encoding: 'utf-8' },
  '台灣': { server: 'whois.twnic.net.tw', port: 43, encoding: 'utf-8' },
  
  // =============== 国家/地区顶级域名 (ccTLD) - 亚洲（完整） ===============
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
  'mn': { server: 'whois.nic.mn', port: 43 },
  'mm': { server: 'whois.nic.mm', port: 43 },
  'bn': { server: 'whois.bnnic.bn', port: 43 },
  'bt': { server: 'whois.nic.bt', port: 43 },
  'kh': { server: 'whois.nic.kh', port: 43 },
  'la': { server: 'whois.nic.la', port: 43 },
  'mo': { server: 'whois.monic.mo', port: 43 },
  'tl': { server: 'whois.nic.tl', port: 43 },
  'mv': { server: 'whois.nic.mv', port: 43 },
  'tm': { server: 'whois.nic.tm', port: 43 },
  'cy': { server: 'whois.nic.cy', port: 43 },
  'tr': { server: 'whois.nic.tr', port: 43 },
  'lb': { server: 'whois.lbdr.org.lb', port: 43 },
  'sy': { server: 'whois.tld.sy', port: 43 },
  'jo': { server: 'whois.nic.jo', port: 43 },
  'iq': { server: 'whois.cmc.iq', port: 43 },
  'kw': { server: 'whois.nic.kw', port: 43 },
  'bh': { server: 'whois.nic.bh', port: 43 },
  'qa': { server: 'whois.registry.qa', port: 43 },
  'om': { server: 'whois.registry.om', port: 43 },
  'ye': { server: 'whois.y.net.ye', port: 43 },
  'ps': { server: 'whois.pnina.ps', port: 43 },
  
  // =============== 中亚/高加索/中东（冷门ccTLD完整） ===============
  'af': { server: 'whois.nic.af', port: 43 },
  'kz': { server: 'whois.nic.kz', port: 43 },
  'uz': { server: 'whois.cctld.uz', port: 43 },
  'tj': { server: 'whois.nic.tj', port: 43 },
  'kg': { server: 'whois.kg', port: 43 },
  'tm': { server: 'whois.nic.tm', port: 43 },
  'am': { server: 'whois.amnic.net', port: 43 },
  'ge': { server: 'whois.nic.ge', port: 43 },
  'az': { server: 'whois.az', port: 43 },
  
  // =============== 国家/地区顶级域名 (ccTLD) - 欧洲（完整） ===============
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
  'mt': { server: 'whois.nic.mt', port: 43 },
  'ad': { server: 'whois.nic.ad', port: 43 },
  'sm': { server: 'whois.nic.sm', port: 43 },
  'va': { server: 'whois.nic.va', port: 43 },
  'ba': { server: 'whois.nic.ba', port: 43 },
  'mk': { server: 'whois.marnet.mk', port: 43 },
  'al': { server: 'whois.akep.al', port: 43 },
  'xk': { server: 'whois.nic.xk', port: 43 },
  'fo': { server: 'whois.nic.fo', port: 43 },
  'ax': { server: 'whois.ax', port: 43 },
  'gg': { server: 'whois.gg', port: 43 },
  'je': { server: 'whois.je', port: 43 },
  'im': { server: 'whois.nic.im', port: 43 },
  'gi': { server: 'whois.nic.gi', port: 43 },
  'su': { server: 'whois.tcinet.ru', port: 43 },
  'рф': { server: 'whois.tcinet.ru', port: 43, encoding: 'utf-8' },
  'eu': { server: 'whois.eu', port: 43 },
  
  // =============== 国家/地区顶级域名 (ccTLD) - 美洲（完整） ===============
  'us': { server: 'whois.nic.us', port: 43 },
  'ca': { server: 'whois.cira.ca', port: 43 },
  'mx': { server: 'whois.mx', port: 43 },
  'br': { server: 'whois.registro.br', port: 43 },
  'ar': { server: 'whois.nic.ar', port: 43 },
  'cl': { server: 'whois.nic.cl', port: 43 },
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
  'cw': { server: 'whois.nic.cw', port: 43 },
  'sx': { server: 'whois.sx', port: 43 },
  'bq': { server: 'whois.nic.bq', port: 43 },
  'ag': { server: 'whois.nic.ag', port: 43 },
  'bb': { server: 'whois.telecoms.gov.bb', port: 43 },
  'bs': { server: 'whois.nic.bs', port: 43 },
  'bm': { server: 'whois.nic.bm', port: 43 },
  'bz': { server: 'whois.afilias-grs.info', port: 43 },
  'dm': { server: 'whois.nic.dm', port: 43 },
  'gd': { server: 'whois.nic.gd', port: 43 },
  'gy': { server: 'whois.gy', port: 43 },
  'ht': { server: 'whois.nic.ht', port: 43 },
  'kn': { server: 'whois.nic.kn', port: 43 },
  'ky': { server: 'whois.kyregistry.ky', port: 43 },
  'lc': { server: 'whois2.afilias-grs.net', port: 43 },
  'ms': { server: 'whois.nic.ms', port: 43 },
  'sr': { server: 'whois.nic.sr', port: 43 },
  'tc': { server: 'whois.nic.tc', port: 43 },
  'vc': { server: 'whois2.afilias-grs.net', port: 43 },
  'vg': { server: 'whois.nic.vg', port: 43 },
  'vi': { server: 'whois.nic.vi', port: 43 },
  'cu': { server: 'whois.nic.cu', port: 43 },
  'gl': { server: 'whois.nic.gl', port: 43 },
  'pm': { server: 'whois.nic.pm', port: 43 },
  'mq': { server: 'whois.mediaserv.net', port: 43 },
  'gp': { server: 'whois.nic.gp', port: 43 },
  'gf': { server: 'whois.mediaserv.net', port: 43 },
  'fk': { server: 'whois.nic.fk', port: 43 },
  
  // =============== 国家/地区顶级域名 (ccTLD) - 大洋洲（完整） ===============
  'au': { server: 'whois.auda.org.au', port: 43 },
  'nz': { server: 'whois.srs.net.nz', port: 43 },
  'fj': { server: 'whois.nic.fj', port: 43 },
  'ws': { server: 'whois.website.ws', port: 43 },
  'to': { server: 'whois.tonic.to', port: 43 },
  'nu': { server: 'whois.iis.nu', port: 43 },
  'ck': { server: 'whois.ck-nic.org.ck', port: 43 },
  'ki': { server: 'whois.nic.ki', port: 43 },
  'sb': { server: 'whois.nic.net.sb', port: 43 },
  'vu': { server: 'whois.nic.vu', port: 43 },
  'pw': { server: 'whois.nic.pw', port: 43 },
  'fm': { server: 'whois.nic.fm', port: 43 },
  'as': { server: 'whois.nic.as', port: 43 },
  'gu': { server: 'whois.nic.gu', port: 43 },
  'mp': { server: 'whois.nic.mp', port: 43 },
  'mh': { server: 'whois.nic.mh', port: 43 },
  'pf': { server: 'whois.nic.pf', port: 43 },
  'nc': { server: 'whois.nic.nc', port: 43 },
  'wf': { server: 'whois.nic.wf', port: 43 },
  'nr': { server: 'whois.nic.nr', port: 43 },
  'pg': { server: 'whois.nic.pg', port: 43 },
  
  // =============== 国家/地区顶级域名 (ccTLD) - 非洲（完整） ===============
  'za': { server: 'whois.registry.net.za', port: 43 },
  'eg': { server: 'whois.egregistry.eg', port: 43 },
  'ng': { server: 'whois.nic.net.ng', port: 43 },
  'ke': { server: 'whois.kenic.or.ke', port: 43 },
  'tz': { server: 'whois.tznic.or.tz', port: 43 },
  'ug': { server: 'whois.co.ug', port: 43 },
  'gh': { server: 'whois.nic.gh', port: 43 },
  'ma': { server: 'whois.registre.ma', port: 43 },
  'tn': { server: 'whois.ati.tn', port: 43 },
  'dz': { server: 'whois.nic.dz', port: 43 },
  'ly': { server: 'whois.nic.ly', port: 43 },
  'sd': { server: 'whois.nic.sd', port: 43 },
  'et': { server: 'whois.nic.et', port: 43 },
  'sn': { server: 'whois.nic.sn', port: 43 },
  'ci': { server: 'whois.nic.ci', port: 43 },
  'cm': { server: 'whois.nic.cm', port: 43 },
  'cd': { server: 'whois.nic.cd', port: 43 },
  'ao': { server: 'whois.nic.ao', port: 43 },
  'mz': { server: 'whois.nic.mz', port: 43 },
  'zw': { server: 'whois.nic.zw', port: 43 },
  'zm': { server: 'whois.nic.zm', port: 43 },
  'bw': { server: 'whois.nic.net.bw', port: 43 },
  'na': { server: 'whois.na-nic.com.na', port: 43 },
  'sz': { server: 'whois.nic.sz', port: 43 },
  'ls': { server: 'whois.nic.ls', port: 43 },
  'rw': { server: 'whois.ricta.org.rw', port: 43 },
  'bi': { server: 'whois.nic.bi', port: 43 },
  'mg': { server: 'whois.nic.mg', port: 43 },
  'mu': { server: 'whois.nic.mu', port: 43 },
  're': { server: 'whois.nic.re', port: 43 },
  'sc': { server: 'whois.nic.sc', port: 43 },
  'km': { server: 'whois.nic.km', port: 43 },
  'yt': { server: 'whois.nic.yt', port: 43 },
  'so': { server: 'whois.nic.so', port: 43 },
  'dj': { server: 'whois.nic.dj', port: 43 },
  'er': { server: 'whois.nic.er', port: 43 },
  'ss': { server: 'whois.nic.ss', port: 43 },
  'mr': { server: 'whois.nic.mr', port: 43 },
  'ml': { server: 'whois.nic.ml', port: 43 },
  'bf': { server: 'whois.nic.bf', port: 43 },
  'ne': { server: 'whois.nic.ne', port: 43 },
  'td': { server: 'whois.nic.td', port: 43 },
  'cf': { server: 'whois.nic.cf', port: 43 },
  'ga': { server: 'whois.nic.ga', port: 43 },
  'cg': { server: 'whois.nic.cg', port: 43 },
  'gq': { server: 'whois.nic.gq', port: 43 },
  'st': { server: 'whois.nic.st', port: 43 },
  'cv': { server: 'whois.nic.cv', port: 43 },
  'gw': { server: 'whois.nic.gw', port: 43 },
  'gm': { server: 'whois.nic.gm', port: 43 },
  'sl': { server: 'whois.nic.sl', port: 43 },
  'lr': { server: 'whois.nic.lr', port: 43 },
  'tg': { server: 'whois.nic.tg', port: 43 },
  'bj': { server: 'whois.nic.bj', port: 43 },
  'sh': { server: 'whois.nic.sh', port: 43 },
  'ac': { server: 'whois.nic.ac', port: 43 },
  
  // =============== 二级域名映射 ===============
  'co.uk': { server: 'whois.nic.uk', port: 43 },
  'org.uk': { server: 'whois.nic.uk', port: 43 },
  'net.uk': { server: 'whois.nic.uk', port: 43 },
  'ac.uk': { server: 'whois.nic.uk', port: 43 },
  'gov.uk': { server: 'whois.nic.uk', port: 43 },
  'com.au': { server: 'whois.auda.org.au', port: 43 },
  'net.au': { server: 'whois.auda.org.au', port: 43 },
  'org.au': { server: 'whois.auda.org.au', port: 43 },
  'edu.au': { server: 'whois.auda.org.au', port: 43 },
  'gov.au': { server: 'whois.auda.org.au', port: 43 },
  'asn.au': { server: 'whois.auda.org.au', port: 43 },
  'id.au': { server: 'whois.auda.org.au', port: 43 },
  'com.cn': { server: 'whois.cnnic.cn', port: 43 },
  'net.cn': { server: 'whois.cnnic.cn', port: 43 },
  'org.cn': { server: 'whois.cnnic.cn', port: 43 },
  'gov.cn': { server: 'whois.cnnic.cn', port: 43 },
  'edu.cn': { server: 'whois.cnnic.cn', port: 43 },
  'ac.cn': { server: 'whois.cnnic.cn', port: 43 },
  'co.jp': { server: 'whois.jprs.jp', port: 43, query: 'DOM ' },
  'ne.jp': { server: 'whois.jprs.jp', port: 43, query: 'DOM ' },
  'or.jp': { server: 'whois.jprs.jp', port: 43, query: 'DOM ' },
  'ac.jp': { server: 'whois.jprs.jp', port: 43, query: 'DOM ' },
  'go.jp': { server: 'whois.jprs.jp', port: 43, query: 'DOM ' },
  'ed.jp': { server: 'whois.jprs.jp', port: 43, query: 'DOM ' },
  'ad.jp': { server: 'whois.jprs.jp', port: 43, query: 'DOM ' },
  'co.kr': { server: 'whois.kr', port: 43 },
  'or.kr': { server: 'whois.kr', port: 43 },
  'ne.kr': { server: 'whois.kr', port: 43 },
  'go.kr': { server: 'whois.kr', port: 43 },
  'ac.kr': { server: 'whois.kr', port: 43 },
  'co.nz': { server: 'whois.srs.net.nz', port: 43 },
  'net.nz': { server: 'whois.srs.net.nz', port: 43 },
  'org.nz': { server: 'whois.srs.net.nz', port: 43 },
  'govt.nz': { server: 'whois.srs.net.nz', port: 43 },
  'ac.nz': { server: 'whois.srs.net.nz', port: 43 },
  'co.za': { server: 'whois.registry.net.za', port: 43 },
  'org.za': { server: 'whois.registry.net.za', port: 43 },
  'net.za': { server: 'whois.registry.net.za', port: 43 },
  'gov.za': { server: 'whois.registry.net.za', port: 43 },
  'ac.za': { server: 'whois.registry.net.za', port: 43 },
  'com.br': { server: 'whois.registro.br', port: 43 },
  'net.br': { server: 'whois.registro.br', port: 43 },
  'org.br': { server: 'whois.registro.br', port: 43 },
  'gov.br': { server: 'whois.registro.br', port: 43 },
  'edu.br': { server: 'whois.registro.br', port: 43 },
  'com.mx': { server: 'whois.mx', port: 43 },
  'org.mx': { server: 'whois.mx', port: 43 },
  'gob.mx': { server: 'whois.mx', port: 43 },
  'net.mx': { server: 'whois.mx', port: 43 },
  'edu.mx': { server: 'whois.mx', port: 43 },
  'com.ar': { server: 'whois.nic.ar', port: 43 },
  'org.ar': { server: 'whois.nic.ar', port: 43 },
  'gob.ar': { server: 'whois.nic.ar', port: 43 },
  'net.ar': { server: 'whois.nic.ar', port: 43 },
  'edu.ar': { server: 'whois.nic.ar', port: 43 },
};

// ==================== RDAP服务器列表 ====================
const RDAP_SERVERS: Record<string, string> = {
  'com': 'https://rdap.verisign.com/com/v1',
  'net': 'https://rdap.verisign.com/net/v1',
  'org': 'https://rdap.publicinterestregistry.org/rdap',
  'info': 'https://rdap.afilias.net/rdap/info',
  'biz': 'https://rdap.nic.biz',
  'name': 'https://rdap.nic.name',
  'mobi': 'https://rdap.afilias.net/rdap/mobi',
  'asia': 'https://rdap.nic.asia',
  'cc': 'https://rdap.verisign.com/cc/v1',
  'tv': 'https://rdap.verisign.com/tv/v1',
  'io': 'https://rdap.nic.io',
  'me': 'https://rdap.nic.me',
  'co': 'https://rdap.nic.co',
  'ai': 'https://rdap.nic.ai',
  'de': 'https://rdap.denic.de',
  'eu': 'https://rdap.eu',
  'uk': 'https://rdap.nominet.uk/uk',
  'nl': 'https://rdap.domain-registry.nl',
  'be': 'https://rdap.dns.be',
  'fr': 'https://rdap.nic.fr',
  'ch': 'https://rdap.nic.ch',
  'at': 'https://rdap.nic.at',
  'pl': 'https://rdap.dns.pl',
  'cz': 'https://rdap.nic.cz',
  'se': 'https://rdap.iis.se',
  'no': 'https://rdap.norid.no',
  'dk': 'https://rdap.dk-hostmaster.dk',
  'fi': 'https://rdap.fi',
  'nz': 'https://rdap.srs.net.nz',
  'au': 'https://rdap.auda.org.au',
  'jp': 'https://rdap.jprs.jp/rdap',
  'kr': 'https://rdap.kr',
  'ru': 'https://rdap.tcinet.ru',
  'br': 'https://rdap.registro.br',
  'mx': 'https://rdap.mx',
  'ar': 'https://rdap.nic.ar',
  'cl': 'https://rdap.nic.cl',
  'cn': 'https://rdap.cnnic.cn',
  'hk': 'https://rdap.hkirc.hk',
  'tw': 'https://rdap.twnic.net.tw',
  'sg': 'https://rdap.sgnic.sg',
  'my': 'https://rdap.mynic.my',
  'th': 'https://rdap.thnic.co.th',
  'in': 'https://rdap.registry.in',
  'app': 'https://rdap.nic.google',
  'dev': 'https://rdap.nic.google',
  'page': 'https://rdap.nic.google',
  'blog': 'https://rdap.nic.blog',
  'cloud': 'https://rdap.nic.cloud',
  'online': 'https://rdap.centralnic.com/online',
  'site': 'https://rdap.centralnic.com/site',
  'xyz': 'https://rdap.centralnic.com/xyz',
  'top': 'https://rdap.nic.top',
  'club': 'https://rdap.nic.club',
  'tech': 'https://rdap.centralnic.com/tech',
  'store': 'https://rdap.centralnic.com/store',
  'fun': 'https://rdap.centralnic.com/fun',
  'icu': 'https://rdap.centralnic.com/icu',
  'vip': 'https://rdap.centralnic.com/vip',
  'shop': 'https://rdap.nic.shop',
  'ltd': 'https://rdap.donuts.co/rdap/',
  'life': 'https://rdap.donuts.co/rdap/',
  'live': 'https://rdap.donuts.co/rdap/',
  'world': 'https://rdap.donuts.co/rdap/',
};

// 解析域名获取TLD（支持IDN）
function getTLD(domain: string): string {
  const parts = domain.toLowerCase().split('.');
  if (parts.length >= 2) {
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    
    const potentialSecondLevel = `${sld}.${tld}`;
    if (WHOIS_SERVERS[potentialSecondLevel]) {
      return potentialSecondLevel;
    }
    
    if (tld === 'uk' && ['co', 'org', 'net', 'ac', 'gov'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'au' && ['com', 'net', 'org', 'edu', 'gov', 'asn', 'id'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'cn' && ['com', 'net', 'org', 'gov', 'edu', 'ac'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'jp' && ['co', 'ne', 'or', 'ac', 'go', 'ed', 'ad'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'kr' && ['co', 'or', 'ne', 'go', 'ac'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'nz' && ['co', 'net', 'org', 'govt', 'ac'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'za' && ['co', 'org', 'net', 'gov', 'ac'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'br' && ['com', 'net', 'org', 'gov', 'edu'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'mx' && ['com', 'org', 'gob', 'net', 'edu'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    if (tld === 'ar' && ['com', 'org', 'gob', 'net', 'edu'].includes(sld)) {
      return `${sld}.${tld}`;
    }
    
    return tld;
  }
  return '';
}

// 直接TCP连接WHOIS服务器查询
async function queryWhoisDirect(domain: string, timeout: number = 10000): Promise<string> {
  const tld = getTLD(domain);
  const serverInfo = WHOIS_SERVERS[tld];
  
  if (!serverInfo) {
    throw new Error(`No WHOIS server found for .${tld} domains`);
  }
  
  console.log(`Connecting to WHOIS server: ${serverInfo.server}:${serverInfo.port} for ${domain}`);
  
  try {
    const connectPromise = Deno.connect({
      hostname: serverInfo.server,
      port: serverInfo.port,
    });
    
    const connectTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), timeout / 2);
    });
    
    const conn = await Promise.race([connectPromise, connectTimeoutPromise]) as Deno.Conn;
    
    let queryDomain = domain;
    if (isIDN(domain)) {
      queryDomain = toASCII(domain);
      console.log(`IDN domain converted: ${domain} -> ${queryDomain}`);
    }
    
    const queryPrefix = serverInfo.query || '';
    const queryString = `${queryPrefix}${queryDomain}\r\n`;
    
    console.log(`Sending WHOIS query: ${queryString.trim()}`);
    
    const encoder = new TextEncoder();
    await conn.write(encoder.encode(queryString));
    
    const decoder = new TextDecoder(serverInfo.encoding || 'utf-8');
    const chunks: Uint8Array[] = [];
    const buffer = new Uint8Array(8192);
    
    const readTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('WHOIS query timeout')), timeout);
    });
    
    const readPromise = (async () => {
      try {
        while (true) {
          const n = await conn.read(buffer);
          if (n === null) break;
          chunks.push(buffer.slice(0, n));
        }
      } finally {
        try { conn.close(); } catch {}
      }
    })();
    
    await Promise.race([readPromise, readTimeoutPromise]);
    
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

  let queryDomain = domain;
  if (isIDN(domain)) {
    queryDomain = toASCII(domain);
    console.log(`IDN domain converted for RDAP: ${domain} -> ${queryDomain}`);
  }

  console.log(`Querying RDAP for ${queryDomain} via ${rdapServer}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`${rdapServer}/domain/${queryDomain}`, {
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
    return parseRDAPResponse(data, domain);
  } catch (error) {
    console.error(`RDAP query failed for ${domain}:`, error);
    throw error;
  }
}

// 解析RDAP响应
function parseRDAPResponse(data: any, originalDomain?: string): any {
  const domain = originalDomain || data.unicodeName || data.ldhName || '';
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
    nameServers: nameservers.map((ns: any) => ns.ldhName || ns.unicodeName).filter(Boolean),
    status: status,
    registrant,
    dnssec: data.secureDNS?.delegationSigned || false,
    lastUpdated: lastUpdated ? formatDate(lastUpdated) : formatDate(new Date().toISOString()),
    source: 'rdap' as const
  };
}

// 增强的未注册域名检测关键词
const NOT_FOUND_INDICATORS = [
  'no match for domain', 'not found', 'no data found',
  'domain is not registered', 'available for registration', 
  'status: free', 'status: available', 'no entries found',
  'nothing found', 'object does not exist', 'domain not found', 
  'no object found', 'the queried object does not exist', 
  'not been registered', 'no matching record', 'domain is available',
  'this domain name has not been registered', 'domain status: free',
  'the domain has not been registered', 'domain name not known',
  'no match', 'domain name is not registered', 'unregistered',
  '该域名未注册', '域名未注册', '未注册', '可以注册',
  '没有找到匹配的记录', '无匹配记录', '域名不存在',
  'no registered', 'ドメイン名は登録されていません',
  'nothing to display', 'no information available',
  'domain available', 'is free', 'not registered',
];

// ==================== 完整的域名状态码映射（全量覆盖） ====================
const STATUS_CODE_MAP: Record<string, string> = {
  // ============ ICANN通用核心状态码 ============
  'ok': '正常',
  'active': '正常',
  'actif': '正常',
  'activo': '正常',
  'registered': '已注册',
  'connect': '已连接',
  'connected': '已连接',
  
  // Hold状态
  'clienthold': '客户暂停',
  'client hold': '客户暂停',
  'serverhold': '注册商暂停',
  'server hold': '注册商暂停',
  'hold': '暂停',
  'inactive': '未激活',
  'suspended': '已暂停',
  'suspendedbyregistrar': '注册商暂停',
  'suspendedbyregistry': '注册局暂停',
  
  // Delete禁止
  'clientdeleteprohibited': '禁止删除',
  'client delete prohibited': '禁止删除',
  'serverdeleteprohibited': '禁止删除',
  'server delete prohibited': '禁止删除',
  'deleteprohibited': '禁止删除',
  
  // Transfer禁止
  'clienttransferprohibited': '禁止转移',
  'client transfer prohibited': '禁止转移',
  'servertransferprohibited': '禁止转移',
  'server transfer prohibited': '禁止转移',
  'transferprohibited': '禁止转移',
  'registrarlock': '注册商锁定',
  'registrylock': '注册局锁定',
  'clientlock': '客户锁定',
  'serverlock': '注册局锁定',
  'locked': '已锁定',
  
  // Renew禁止
  'clientrenewprohibited': '禁止续费',
  'client renew prohibited': '禁止续费',
  'serverrenewprohibited': '禁止续费',
  'server renew prohibited': '禁止续费',
  'renewprohibited': '禁止续费',
  
  // Update禁止
  'clientupdateprohibited': '禁止修改',
  'client update prohibited': '禁止修改',
  'serverupdateprohibited': '禁止修改',
  'server update prohibited': '禁止修改',
  'updateprohibited': '禁止修改',
  
  // 续费/过期相关
  'autorenewperiod': '自动续费期',
  'auto renew period': '自动续费期',
  'redemptionperiod': '赎回期',
  'redemption period': '赎回期',
  'pendingrestore': '待恢复',
  'pending restore': '待恢复',
  'pendingdelete': '待删除',
  'pending delete': '待删除',
  'graceperiod': '宽限期',
  'grace period': '宽限期',
  'addperiod': '注册宽限期',
  'add period': '注册宽限期',
  'renewperiod': '续费宽限期',
  'renew period': '续费宽限期',
  'transferperiod': '转移宽限期',
  'transfer period': '转移宽限期',
  'extendedrenewperiod': '延长续费期',
  'extended renewal period': '延长续费期',
  'autorenewfailed': '自动续费失败',
  'renewfailed': '续费失败',
  'expired': '已过期',
  
  // 转移相关
  'pendingtransfer': '转移中',
  'pending transfer': '转移中',
  'transferapproved': '转移已批准',
  'transfer approved': '转移已批准',
  'transferrejected': '转移被拒绝',
  'transfer rejected': '转移被拒绝',
  'pendingauthorization': '待授权',
  'pendingauthinfo': '待转移码',
  
  // 注册/验证相关
  'pendingregistration': '注册中',
  'pending registration': '注册中',
  'pendingverification': '待验证',
  'pending verification': '待验证',
  'pendingrenewal': '续费中',
  'pending renewal': '续费中',
  'pendingupdate': '修改中',
  'pending update': '修改中',
  'pendingcreate': '创建中',
  'pending create': '创建中',
  'holdononregistration': '注册暂存',
  'registrationpending': '注册审核中',
  
  // 争议/违规相关
  'dispute': '争议中',
  'udrppending': 'UDRP争议中',
  'courtorder': '司法锁定',
  'court order': '司法锁定',
  'trademarklaim': '商标申诉中',
  'trademarkvalidated': '商标已验证',
  'abusiveregistration': '恶意注册',
  'spamrelated': '垃圾邮件相关',
  'phishingrelated': '钓鱼网站相关',
  'malwarerelated': '恶意软件相关',
  'copyrightinfringement': '版权侵权',
  'revoked': '已吊销',
  'cancelled': '已注销',
  
  // DNS相关
  'dnshold': 'DNS锁定',
  'dns hold': 'DNS锁定',
  'dnserror': 'DNS配置错误',
  'dnsok': 'DNS正常',
  'nameserverhold': '域名服务器暂停',
  'nameserverupdateprohibited': '禁止修改DNS',
  'noresolve': '解析失效',
  'resolveok': '解析正常',
  
  // 特殊状态
  'parked': '停放中',
  'premium': '溢价域名',
  'reserved': '保留域名',
  'reservedrenewal': '保留续费',
  'updateapproved': '修改已批准',
  'updaterejected': '修改被拒绝',
  'pendingautorenew': '待自动续费',
  
  // 地区专属状态
  'servertransferapproved': '转移已审核',
  'clienttransferapproved': '客户确认转移',
  'linkhold': '关联锁定',
  'mianfeihold': '免费域名暂停',
  'bizdeleteprohibited': '企业禁止删除',
  'org-mandatory': '组织资质审核',
  'georestricted': '地域限制',
  'nonresident': '非本地居民',
  'agentrequired': '代理审核中',
  'individualhold': '个人注册锁定',
  'corporatehold': '企业注册锁定',
  'us-citizen': '美国公民审核',
  'ca-resident': '加拿大居民审核',
  'au-trademark': '澳大利亚商标审核',
  'localagent': '本地代理审核',
  'paymentpending': '付款待确认',
  'registrypending': '注册局审核中',
  
  // 隐私保护
  'hiddeninwhois': '隐私保护',
  'privacy': '隐私保护',
  'privacyprotected': '隐私保护',
  'redacted': '信息隐藏',
  'whoisprotect': 'WHOIS保护',
  
  // 多语言状态
  'enregistré': '已注册',
  'actif': '正常',
  'valide': '有效',
  'expiré': '已过期',
  'suspendu': '已暂停',
  'registrado': '已注册',
  'ativo': '正常',
  'expirado': '已过期',
  'suspenso': '已暂停',
  '有効': '有效',
  '登録済み': '已注册',
  '활성': '正常',
  '등록됨': '已注册',
  'зарегистрирован': '已注册',
  'активен': '正常',
};

// 翻译域名状态
function translateStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/[_\-\s]+/g, '').trim();
  
  // 首先尝试精确匹配
  if (STATUS_CODE_MAP[normalized]) {
    return STATUS_CODE_MAP[normalized];
  }
  
  // 尝试原始格式匹配
  const lowerStatus = status.toLowerCase().trim();
  if (STATUS_CODE_MAP[lowerStatus]) {
    return STATUS_CODE_MAP[lowerStatus];
  }
  
  // 处理带URL的状态（如 clientTransferProhibited https://icann.org/epp#...）
  const statusWithoutUrl = status.replace(/https?:\/\/[^\s]*/gi, '').trim();
  const normalizedWithoutUrl = statusWithoutUrl.toLowerCase().replace(/[_\-\s]+/g, '');
  if (STATUS_CODE_MAP[normalizedWithoutUrl]) {
    return STATUS_CODE_MAP[normalizedWithoutUrl];
  }
  
  // 模糊匹配关键词
  const keywords: Record<string, string> = {
    'prohibited': '禁止',
    'hold': '暂停',
    'lock': '锁定',
    'pending': '待处理',
    'transfer': '转移',
    'delete': '删除',
    'update': '修改',
    'renew': '续费',
    'active': '正常',
    'ok': '正常',
    'redemption': '赎回期',
    'expired': '已过期',
    'suspended': '已暂停',
    'dispute': '争议中',
    'reserved': '保留',
    'premium': '溢价',
  };
  
  for (const [key, value] of Object.entries(keywords)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  // 返回原始状态
  return status;
}

// 解析WHOIS文本响应（增强版 - 支持更多格式）
function parseWhoisText(text: string, domain: string): any {
  console.log(`Parsing WHOIS response for ${domain}, length: ${text.length}`);
  
  const lines = text.split('\n');
  const result: any = { 
    domain,
    registrar: null,
    registrationDate: null,
    expirationDate: null,
    nameServers: [],
    status: [],
    dnssec: false,
    lastUpdated: null,
    source: 'whois' as const,
    registrant: {},
    rawWhois: text
  };
  
  const textLower = text.toLowerCase();
  
  let hasRegistrarInfo = false;
  let hasValidDates = false;
  let hasNameServers = false;
  
  // 注册商识别正则（高优先级）
  const registrarPrimaryPatterns = [
    /^registrar:\s*(.+)/i,
    /^sponsoring registrar:\s*(.+)/i,
    /^registrar name:\s*(.+)/i,
    /^registrar organization:\s*(.+)/i,
    /^registrar company:\s*(.+)/i,
    /^registrar info:\s*(.+)/i,
    /^registered by:\s*(.+)/i,
    /^registered through:\s*(.+)/i,
    /^注册商:\s*(.+)/i,
    /^域名注册商:\s*(.+)/i,
    /^bureau d'enregistrement:\s*(.+)/i,
    /^registraire:\s*(.+)/i,
    /^registro:\s*(.+)/i,
    /^registrador:\s*(.+)/i,
    /^レジストラ:\s*(.+)/i,
    /^등록대행자:\s*(.+)/i,
    /^регистратор:\s*(.+)/i,
    // .hu .ge .om specific patterns
    /^admin-c\/registrar:\s*(.+)/i,
    /^sponsoring company:\s*(.+)/i,
    /^domain registrar:\s*(.+)/i,
    /^provider:\s*(.+)/i,
    /^reseller:\s*(.+)/i,
    /^current registrar:\s*(.+)/i,
  ];
  
  const registrarSecondaryPatterns = [
    /^registrant name:\s*(.+)/i,
    /^holder:\s*(.+)/i,
    /^domain holder:\s*(.+)/i,
    /^owner:\s*(.+)/i,
    /^titulaire:\s*(.+)/i,
    /^registrante:\s*(.+)/i,
    /^登録者:\s*(.+)/i,
  ];
  
  const skipBlockMarkers = ['[HOLDER]', '[ADMIN_C]', '[TECH_C]', '[BILLING_C]', '[ADMIN-C]', '[TECH-C]', '[BILLING-C]'];
  
  // 增强的日期识别正则（支持全球格式）
  const creationDatePatterns = [
    /creation date:\s*(.+)/i,
    /created:\s*(.+)/i,
    /created on:\s*(.+)/i,
    /created date:\s*(.+)/i,
    /create date:\s*(.+)/i,
    /registration time:\s*(.+)/i,
    /registration date:\s*(.+)/i,
    /registered on:\s*(.+)/i,
    /registered:\s*(.+)/i,
    /registered date:\s*(.+)/i,
    /domain registered:\s*(.+)/i,
    /domain create date:\s*(.+)/i,
    /domain created:\s*(.+)/i,
    /record created:\s*(.+)/i,
    /record create date:\s*(.+)/i,
    /activation date:\s*(.+)/i,
    /activated:\s*(.+)/i,
    /commencement date:\s*(.+)/i,
    /注册时间:\s*(.+)/i,
    /注册日期:\s*(.+)/i,
    /创建日期:\s*(.+)/i,
    /creation:\s*(.+)/i,
    /date de création:\s*(.+)/i,
    /créé le:\s*(.+)/i,
    /fecha de creación:\s*(.+)/i,
    /fecha de registro:\s*(.+)/i,
    /data de criação:\s*(.+)/i,
    /data de registro:\s*(.+)/i,
    /登録年月日:\s*(.+)/i,
    /作成日:\s*(.+)/i,
    /등록일:\s*(.+)/i,
    /дата регистрации:\s*(.+)/i,
    /created-date:\s*(.+)/i,
    /first registered:\s*(.+)/i,
    /domain create:\s*(.+)/i,
    /anniversary date:\s*(.+)/i,
    /initial registration:\s*(.+)/i,
    /nic-creation-date:\s*(.+)/i,
    /domain-created:\s*(.+)/i,
    // .om .hu .ge 和其他国家格式
    /registration\s+date:\s*(.+)/i,
    /reg[.\s]date:\s*(.+)/i,
    /date registered:\s*(.+)/i,
    /first registration:\s*(.+)/i,
    /domain creation date:\s*(.+)/i,
    /regdate:\s*(.+)/i,
    /created on\s*:\s*(.+)/i,
    /domain-reg-date:\s*(.+)/i,
    /crdate:\s*(.+)/i,
    /registration\s*:\s*(.+)/i,
  ];
  
  const expirationDatePatterns = [
    /expiry date:\s*(.+)/i,
    /expires:\s*(.+)/i,
    /expires on:\s*(.+)/i,
    /expiration date:\s*(.+)/i,
    /expiration:\s*(.+)/i,
    /expiration time:\s*(.+)/i,
    /expire date:\s*(.+)/i,
    /expire:\s*(.+)/i,
    /registry expiry date:\s*(.+)/i,
    /registrar registration expiration date:\s*(.+)/i,
    /domain expiration date:\s*(.+)/i,
    /domain expires:\s*(.+)/i,
    /record expires:\s*(.+)/i,
    /record expiry:\s*(.+)/i,
    /renewal date:\s*(.+)/i,
    /renewal:\s*(.+)/i,
    /renew date:\s*(.+)/i,
    /valid until:\s*(.+)/i,
    /valid through:\s*(.+)/i,
    /valid till:\s*(.+)/i,
    /validity:\s*(.+)/i,
    /paid-till:\s*(.+)/i,
    /paid till:\s*(.+)/i,
    /billing date:\s*(.+)/i,
    /过期时间:\s*(.+)/i,
    /过期日期:\s*(.+)/i,
    /到期日期:\s*(.+)/i,
    /有效期至:\s*(.+)/i,
    /date d'expiration:\s*(.+)/i,
    /expire le:\s*(.+)/i,
    /fecha de expiración:\s*(.+)/i,
    /fecha de vencimiento:\s*(.+)/i,
    /data de expiração:\s*(.+)/i,
    /data de validade:\s*(.+)/i,
    /有効期限:\s*(.+)/i,
    /満了日:\s*(.+)/i,
    /만료일:\s*(.+)/i,
    /дата окончания:\s*(.+)/i,
    /expired:\s*(.+)/i,
    /expiry:\s*(.+)/i,
    /due date:\s*(.+)/i,
    /nic-expiry-date:\s*(.+)/i,
    /domain-expiry:\s*(.+)/i,
    /domain validity:\s*(.+)/i,
    /valid to:\s*(.+)/i,
    /expire on:\s*(.+)/i,
    // .om .hu .ge 和其他格式
    /exp[.\s]date:\s*(.+)/i,
    /expdate:\s*(.+)/i,
    /domain expiry date:\s*(.+)/i,
    /domain-exp-date:\s*(.+)/i,
    /free-date:\s*(.+)/i,
    /next renewal:\s*(.+)/i,
    /next due date:\s*(.+)/i,
    /valid date:\s*(.+)/i,
    /domain exp date:\s*(.+)/i,
  ];
  
  // 更新日期模式（排除查询时间模式）
  const updateDatePatterns = [
    /updated date:\s*(.+)/i,
    /updated:\s*(.+)/i,
    /updated on:\s*(.+)/i,
    /last updated:\s*(.+)/i,
    /last updated on:\s*(.+)/i,
    /last update:\s*(.+)/i,
    /last modification:\s*(.+)/i,
    /last modified on:\s*(.+)/i,
    /modification date:\s*(.+)/i,
    /modified:\s*(.+)/i,
    /modified on:\s*(.+)/i,
    /changed:\s*(.+)/i,
    /changed on:\s*(.+)/i,
    /change date:\s*(.+)/i,
    /domain last updated:\s*(.+)/i,
    /record last updated:\s*(.+)/i,
    /更新时间:\s*(.+)/i,
    /更新日期:\s*(.+)/i,
    /最后更新:\s*(.+)/i,
    /最終更新:\s*(.+)/i,
    /date de modification:\s*(.+)/i,
    /dernière modification:\s*(.+)/i,
    /fecha de actualización:\s*(.+)/i,
    /data de atualização:\s*(.+)/i,
    /дата обновления:\s*(.+)/i,
    // 更多格式
    /last-update:\s*(.+)/i,
    /update date:\s*(.+)/i,
    /domain-update-date:\s*(.+)/i,
    /record updated:\s*(.+)/i,
    /upd-date:\s*(.+)/i,
    /last changed:\s*(.+)/i,
    /mod-date:\s*(.+)/i,
  ];
  
  const nameServerPatterns = [
    /name server:\s*(.+)/i,
    /nameserver:\s*(.+)/i,
    /name servers:\s*(.+)/i,
    /nameservers:\s*(.+)/i,
    /nserver:\s*(.+)/i,
    /ns:\s*(.+)/i,
    /dns:\s*(.+)/i,
    /dns server:\s*(.+)/i,
    /dns servers:\s*(.+)/i,
    /primary ns:\s*(.+)/i,
    /secondary ns:\s*(.+)/i,
    /host name:\s*(.+)/i,
    /hostname:\s*(.+)/i,
    /域名服务器:\s*(.+)/i,
    /DNS服务器:\s*(.+)/i,
    /serveur dns:\s*(.+)/i,
    /serveur de noms:\s*(.+)/i,
    /servidor dns:\s*(.+)/i,
    /ネームサーバ:\s*(.+)/i,
    /네임서버:\s*(.+)/i,
  ];
  
  const statusPatterns = [
    /domain status:\s*(.+)/i,
    /status:\s*(.+)/i,
    /domain state:\s*(.+)/i,
    /state:\s*(.+)/i,
    /domain status code:\s*(.+)/i,
    /epp status:\s*(.+)/i,
    /状态:\s*(.+)/i,
    /域名状态:\s*(.+)/i,
    /statut:\s*(.+)/i,
    /estado:\s*(.+)/i,
    /ステータス:\s*(.+)/i,
    /상태:\s*(.+)/i,
  ];
  
  // 全局字段标识
  const globalFieldPatterns = [
    /^domain name:/i, /^registrar:/i, /^creation date:/i, /^expiration date:/i,
    /^name server:/i, /^domain status:/i, /^dnssec:/i, /^updated date:/i,
    /^registry expiry date:/i, /^registered:/i, /^expires:/i, /^created:/i,
  ];
  
  let inSkipBlock = false;
  let primaryRegistrarFound = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 处理Tab分隔的行（某些注册局如.bn使用Tab分隔）
    const trimmed = line.replace(/\t+/g, ': ').trim();
    
    if (!trimmed || trimmed.startsWith('%') || trimmed.startsWith('#') || trimmed.startsWith('>') || trimmed.startsWith('>>>')) {
      continue;
    }
    
    const isGlobalField = globalFieldPatterns.some(p => p.test(trimmed));
    
    if (skipBlockMarkers.some(marker => trimmed.includes(marker))) {
      inSkipBlock = true;
      continue;
    }
    
    if (!trimmed.includes(':') && inSkipBlock) {
      continue;
    }
    
    const skipRegistrarParsing = inSkipBlock && !isGlobalField;
    
    // 注册商信息（高优先级）
    if (!skipRegistrarParsing && !primaryRegistrarFound) {
      for (const pattern of registrarPrimaryPatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value && value !== '-' && value.length > 1 && value.toLowerCase() !== 'unknown') {
            result.registrar = value;
            hasRegistrarInfo = true;
            primaryRegistrarFound = true;
            break;
          }
        }
      }
    }
    
    // 注册商信息（低优先级）
    if (!skipRegistrarParsing && !hasRegistrarInfo) {
      for (const pattern of registrarSecondaryPatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value && value !== '-' && value.length > 1 && value.toLowerCase() !== 'unknown') {
            result.registrar = value;
            hasRegistrarInfo = true;
            break;
          }
        }
      }
    }
    
    // 创建日期
    if (!result.registrationDate) {
      for (const pattern of creationDatePatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const dateValue = match[1].trim();
          if (dateValue && dateValue !== '-') {
            result.registrationDate = formatDate(dateValue);
            hasValidDates = true;
            break;
          }
        }
      }
    }
    
    // 到期日期
    if (!result.expirationDate) {
      for (const pattern of expirationDatePatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const dateValue = match[1].trim();
          if (dateValue && dateValue !== '-') {
            result.expirationDate = formatDate(dateValue);
            hasValidDates = true;
            break;
          }
        }
      }
    }
    
    // 更新日期（排除"Last Modified"因为某些注册局用它表示查询时间）
    if (!result.lastUpdated) {
      // 跳过 "Last Modified" 模式，因为 .bn 等注册局用它表示查询时间
      const isLastModified = /last modified:/i.test(trimmed);
      if (!isLastModified) {
        for (const pattern of updateDatePatterns) {
          const match = trimmed.match(pattern);
          if (match && match[1]) {
            const dateValue = match[1].trim();
            if (dateValue && dateValue !== '-') {
              result.lastUpdated = formatDate(dateValue);
              break;
            }
          }
        }
      }
    }
    
    // DNS服务器（增强解析）
    for (const pattern of nameServerPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const nsValues = match[1].trim().split(/[,;\s]+/);
        for (const nsRaw of nsValues) {
          const ns = nsRaw.toLowerCase().trim();
          if (ns && 
              ns !== '-' && 
              ns !== 'not' &&
              ns !== 'available' &&
              ns !== 'none' &&
              ns !== 'n/a' &&
              ns.length > 3 &&
              !result.nameServers.includes(ns) && 
              (ns.includes('.') || ns.match(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/))) {
            result.nameServers.push(ns);
            hasNameServers = true;
          }
        }
        break;
      }
    }
    
    // 额外的 NS 检测
    if (trimmed.match(/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i) && 
        !trimmed.includes(':') && 
        !trimmed.includes(' ') &&
        trimmed.length > 5 &&
        trimmed.length < 100) {
      const potentialNs = trimmed.toLowerCase();
      if ((potentialNs.includes('ns') || 
           potentialNs.includes('dns') || 
           potentialNs.includes('name') ||
           potentialNs.match(/^ns\d*\./)) &&
          !result.nameServers.includes(potentialNs)) {
        result.nameServers.push(potentialNs);
        hasNameServers = true;
      }
    }
    
    // 域名状态
    for (const pattern of statusPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const statusText = match[1].trim();
        const statuses = statusText.split(/[,;\s]+/).filter(s => s.length > 0);
        statuses.forEach(status => {
          const cleanStatus = status.replace(/https?:\/\/[^\s]*/g, '').trim();
          if (cleanStatus && !result.status.includes(cleanStatus) && cleanStatus.length > 1) {
            result.status.push(cleanStatus);
          }
        });
        break;
      }
    }
    
    // DNSSEC（增强检测）
    if (trimmed.toLowerCase().includes('dnssec')) {
      const dnssecMatch = trimmed.match(/dnssec:\s*(.+)/i);
      if (dnssecMatch && dnssecMatch[1]) {
        const dnssecValue = dnssecMatch[1].trim().toLowerCase();
        const enabledIndicators = ['signed', 'yes', 'enabled', 'active', '是', 'oui', 'signée'];
        const disabledIndicators = ['unsigned', 'no', 'disabled', 'inactive', '否', 'non', 'not signed'];
        
        if (disabledIndicators.some(ind => dnssecValue.includes(ind))) {
          result.dnssec = false;
        } else if (enabledIndicators.some(ind => dnssecValue.includes(ind))) {
          result.dnssec = true;
        }
      }
    }
    
    // 注册人信息 - 增强解析
    const registrantNamePatterns = [
      /registrant(?:\s+name)?:\s*(.+)/i,
      /registrant contact name:\s*(.+)/i,
      /holder(?:\s+name)?:\s*(.+)/i,
      /owner(?:\s+name)?:\s*(.+)/i,
      /domain holder:\s*(.+)/i,
      /titulaire:\s*(.+)/i,
      /注册者:\s*(.+)/i,
      /registrante:\s*(.+)/i,
      /登録者名:\s*(.+)/i,
    ];
    if (!result.registrant.name) {
      for (const pattern of registrantNamePatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value && value !== '-' && value.length > 1 && !value.toLowerCase().includes('redacted') && !value.toLowerCase().includes('privacy')) {
            result.registrant.name = value;
            break;
          }
        }
      }
    }
    
    // 组织
    const registrantOrgPatterns = [
      /registrant\s+org(?:anization)?:\s*(.+)/i,
      /registrant contact organization:\s*(.+)/i,
      /holder organization:\s*(.+)/i,
      /organization:\s*(.+)/i,
      /org:\s*(.+)/i,
      /organisation:\s*(.+)/i,
      /organización:\s*(.+)/i,
      /组织:\s*(.+)/i,
      /会社名:\s*(.+)/i,
    ];
    if (!result.registrant.organization) {
      for (const pattern of registrantOrgPatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value && value !== '-' && value.length > 1 && !value.toLowerCase().includes('redacted') && !value.toLowerCase().includes('privacy')) {
            result.registrant.organization = value;
            break;
          }
        }
      }
    }
    
    // 国家
    const registrantCountryPatterns = [
      /registrant\s+country:\s*(.+)/i,
      /registrant contact country:\s*(.+)/i,
      /holder country:\s*(.+)/i,
      /country:\s*(.+)/i,
      /pays:\s*(.+)/i,
      /país:\s*(.+)/i,
      /国家:\s*(.+)/i,
    ];
    if (!result.registrant.country) {
      for (const pattern of registrantCountryPatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim().toUpperCase();
          if (value && value !== '-' && (value.length === 2 || value.length === 3 || value.length > 3)) {
            result.registrant.country = value;
            break;
          }
        }
      }
    }
    
    // 邮箱
    const registrantEmailPatterns = [
      /registrant\s+email:\s*(.+)/i,
      /registrant contact email:\s*(.+)/i,
      /holder email:\s*(.+)/i,
      /admin email:\s*(.+)/i,
      /contact email:\s*(.+)/i,
      /e-mail:\s*(.+)/i,
      /email:\s*(.+)/i,
      /邮箱:\s*(.+)/i,
      /电子邮件:\s*(.+)/i,
      /courriel:\s*(.+)/i,
    ];
    if (!result.registrant.email) {
      for (const pattern of registrantEmailPatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim().toLowerCase();
          if (value && value.includes('@') && !value.includes('redacted') && !value.includes('privacy') && !value.includes('whoisguard') && !value.includes('withheld')) {
            result.registrant.email = value;
            break;
          }
        }
      }
    }
    
    // 电话
    const registrantPhonePatterns = [
      /registrant\s+phone:\s*(.+)/i,
      /registrant contact phone:\s*(.+)/i,
      /holder phone:\s*(.+)/i,
      /phone:\s*(.+)/i,
      /tel:\s*(.+)/i,
      /telephone:\s*(.+)/i,
      /téléphone:\s*(.+)/i,
      /电话:\s*(.+)/i,
      /联系电话:\s*(.+)/i,
    ];
    if (!result.registrant.phone) {
      for (const pattern of registrantPhonePatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value && value !== '-' && !value.toLowerCase().includes('redacted') && !value.toLowerCase().includes('privacy') && (value.includes('+') || /\d{6,}/.test(value.replace(/\D/g, '')))) {
            result.registrant.phone = value;
            break;
          }
        }
      }
    }
    
    // 省/州
    const registrantStatePatterns = [
      /registrant\s+state(?:\/province)?:\s*(.+)/i,
      /registrant contact state(?:\/province)?:\s*(.+)/i,
      /holder state:\s*(.+)/i,
      /state(?:\/province)?:\s*(.+)/i,
      /province:\s*(.+)/i,
      /région:\s*(.+)/i,
      /省份:\s*(.+)/i,
      /州:\s*(.+)/i,
    ];
    if (!result.registrant.state) {
      for (const pattern of registrantStatePatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value && value !== '-' && value.length > 1 && !value.toLowerCase().includes('redacted')) {
            result.registrant.state = value;
            break;
          }
        }
      }
    }
    
    // 城市
    const registrantCityPatterns = [
      /registrant\s+city:\s*(.+)/i,
      /registrant contact city:\s*(.+)/i,
      /holder city:\s*(.+)/i,
      /city:\s*(.+)/i,
      /ville:\s*(.+)/i,
      /ciudad:\s*(.+)/i,
      /城市:\s*(.+)/i,
    ];
    if (!result.registrant.city) {
      for (const pattern of registrantCityPatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value && value !== '-' && value.length > 1 && !value.toLowerCase().includes('redacted')) {
            result.registrant.city = value;
            break;
          }
        }
      }
    }
  }
  
  // 翻译所有状态码
  result.status = result.status.map((s: string) => translateStatus(s));
  
  // 只有在没有任何注册信息时才检查未注册标识
  if (!hasRegistrarInfo && !hasValidDates && !hasNameServers) {
    if (NOT_FOUND_INDICATORS.some(indicator => textLower.includes(indicator))) {
      throw new Error('domain_not_found');
    }
  }
  
  return result;
}

// 格式化日期为中文年月日格式（全球格式支持）
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === '-' || dateStr.toLowerCase() === 'n/a' || dateStr.toLowerCase() === 'not available') {
    return '';
  }
  
  try {
    let cleanDateStr = dateStr
      .replace(/\s*\(.*?\)/g, '')
      .replace(/\s*UTC.*/i, '')
      .replace(/\s*GMT.*/i, '')
      .replace(/\s*\+\d{2}:\d{2}.*/, '')
      .replace(/\s+[+-]\d{4}$/, '')
      .replace(/T/, ' ')
      .replace(/Z$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const monthMap: Record<string, number> = {
      'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
      'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
      'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
      'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12,
      'janvier': 1, 'février': 2, 'fevrier': 2, 'mars': 3, 'avril': 4, 'mai': 5,
      'juin': 6, 'juillet': 7, 'août': 8, 'aout': 8, 'septembre': 9, 'octobre': 10,
      'novembre': 11, 'décembre': 12, 'decembre': 12,
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
      'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'maio': 5, 'junho': 6,
      'julho': 7, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
      'januar': 1, 'februar': 2, 'marz': 3, 'märz': 3, 'juni': 6, 'juli': 7,
      'oktober': 10, 'dezember': 12,
      'gennaio': 1, 'febbraio': 2, 'aprile': 4, 'maggio': 5, 'giugno': 6,
      'luglio': 7, 'settembre': 9, 'ottobre': 10, 'dicembre': 12,
    };
    
    const datePatterns = [
      { pattern: /(\d{1,2})-([a-zA-Z]{3,})-(\d{4})(?:\s|$|[T\s]\d)/i, order: 'dmy_text' },
      { pattern: /(\d{1,2})\s+([a-zA-Zéûàç]+)\s+(\d{4})(?:\s|$|[T\s]\d)/i, order: 'dmy_text' },
      { pattern: /([a-zA-Zéûàç]+)\s+(\d{1,2}),?\s+(\d{4})/i, order: 'mdy_text' },
      { pattern: /(\d{4})-([a-zA-Z]{3,})-(\d{1,2})/i, order: 'ymd_text' },
      { pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/, order: 'ymd' },
      { pattern: /(\d{4})\.(\d{1,2})\.(\d{1,2})/, order: 'ymd' },
      { pattern: /(\d{4})\/(\d{1,2})\/(\d{1,2})/, order: 'ymd' },
      { pattern: /^(\d{4})(\d{2})(\d{2})$/, order: 'ymd' },
      { pattern: /(\d{4})年(\d{1,2})月(\d{1,2})日/, order: 'ymd' },
      { pattern: /(\d{1,2})\.(\d{1,2})\.(\d{4})/, order: 'dmy' },
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, order: 'mdy' },
      { pattern: /(\d{1,2})-(\d{1,2})-(\d{4})/, order: 'dmy' },
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{2})$/, order: 'dmy_short' },
      // 额外的日期格式
      { pattern: /(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})/, order: 'ymd' },  // 带空格的 YYYY-MM-DD
      { pattern: /(\d{2})\.(\d{2})\.(\d{4})/, order: 'dmy' },  // DD.MM.YYYY
      { pattern: /(\d{4})(\d{2})(\d{2})(?:\d{6})?/, order: 'ymd' },  // YYYYMMDD 或 YYYYMMDDHHMMSS
      { pattern: /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/, order: 'dmy' },  // 带空格的 DD.MM.YYYY
      { pattern: /(\d{4})\s+(\d{1,2})\s+(\d{1,2})/, order: 'ymd' },  // YYYY MM DD (空格分隔)
    ];
    
    for (const { pattern, order } of datePatterns) {
      const match = cleanDateStr.match(pattern);
      if (match) {
        let year: string, month: string, day: string;
        
        switch (order) {
          case 'ymd':
            [, year, month, day] = match;
            break;
          case 'mdy':
            [, month, day, year] = match;
            break;
          case 'dmy':
            [, day, month, year] = match;
            break;
          case 'dmy_text': {
            day = match[1];
            const monthName = match[2].toLowerCase();
            const monthNum = monthMap[monthName] || monthMap[monthName.substring(0, 3)];
            if (!monthNum) continue;
            month = String(monthNum);
            year = match[3];
            break;
          }
          case 'mdy_text': {
            const monthName = match[1].toLowerCase();
            const monthNum = monthMap[monthName] || monthMap[monthName.substring(0, 3)];
            if (!monthNum) continue;
            month = String(monthNum);
            day = match[2];
            year = match[3];
            break;
          }
          case 'ymd_text': {
            year = match[1];
            const monthName = match[2].toLowerCase();
            const monthNum = monthMap[monthName] || monthMap[monthName.substring(0, 3)];
            if (!monthNum) continue;
            month = String(monthNum);
            day = match[3];
            break;
          }
          case 'dmy_short': {
            day = match[1];
            month = match[2];
            const shortYear = parseInt(match[3], 10);
            year = String(shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear);
            break;
          }
          default:
            continue;
        }
        
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        
        if (yearNum >= 1980 && yearNum <= 2100 && 
            monthNum >= 1 && monthNum <= 12 && 
            dayNum >= 1 && dayNum <= 31) {
          return `${yearNum}年${String(monthNum).padStart(2, '0')}月${String(dayNum).padStart(2, '0')}日`;
        }
      }
    }
    
    const isoDate = new Date(cleanDateStr);
    if (!isNaN(isoDate.getTime())) {
      const year = isoDate.getFullYear();
      const month = isoDate.getMonth() + 1;
      const day = isoDate.getDate();
      
      if (year >= 1980 && year <= 2100) {
        return `${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;
      }
    }
    
    if (/\d{4}/.test(cleanDateStr)) {
      return cleanDateStr;
    }
    
    return '';
  } catch {
    return dateStr;
  }
}

// 检查域名是否未注册
function checkNotRegistered(whoisText: string, domain: string): boolean {
  const textLower = whoisText.toLowerCase();
  
  if (whoisText.length < 50) {
    return true;
  }
  
  if (NOT_FOUND_INDICATORS.some(indicator => textLower.includes(indicator))) {
    const hasRegistrarInfo = /registrar:|registrant:|creation date:|created:|name server:/i.test(whoisText);
    if (!hasRegistrarInfo) {
      return true;
    }
  }
  
  return false;
}

// 执行域名查询 - RDAP优先，WHOIS兜底
async function performDualLookup(domain: string): Promise<any> {
  const results: any = {};
  const errors: string[] = [];
  
  const originalDomain = domain;
  const asciiDomain = isIDN(domain) ? toASCII(domain) : domain;
  const tld = getTLD(asciiDomain);

  console.log(`Starting lookup for ${originalDomain} (ASCII: ${asciiDomain}, TLD: ${tld})`);

  // 1. 首先尝试RDAP查询
  if (RDAP_SERVERS[tld]) {
    try {
      console.log(`Attempting RDAP query for ${asciiDomain}`);
      const rdapResult = await queryRDAP(originalDomain);
      if (rdapResult) {
        results.primary = rdapResult;
        console.log(`RDAP lookup successful for ${originalDomain}`);
      }
    } catch (error) {
      console.log(`RDAP failed for ${originalDomain}: ${error.message}`);
      errors.push(`RDAP: ${error.message}`);
      
      if (error.message === 'domain_not_found') {
        return {
          error: `域名 ${originalDomain} 未注册，该域名可供注册使用`,
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
        console.log(`Attempting direct WHOIS query for ${asciiDomain}`);
        const whoisText = await queryWhoisDirect(originalDomain, 12000);
        
        if (checkNotRegistered(whoisText, originalDomain)) {
          return {
            error: `域名 ${originalDomain} 未注册，该域名可供注册使用`,
            errorType: 'domain_not_found'
          };
        }
        
        if (whoisText && whoisText.length > 20) {
          try {
            const whoisResult = parseWhoisText(whoisText, originalDomain);
            if (whoisResult && (whoisResult.registrar || 
                whoisResult.registrationDate || whoisResult.nameServers.length > 0)) {
              results.primary = whoisResult;
              console.log(`WHOIS lookup successful for ${originalDomain}`);
            } else {
              return {
                error: `域名 ${originalDomain} 未注册，该域名可供注册使用`,
                errorType: 'domain_not_found'
              };
            }
          } catch (parseError) {
            if (parseError.message === 'domain_not_found') {
              return {
                error: `域名 ${originalDomain} 未注册，该域名可供注册使用`,
                errorType: 'domain_not_found'
              };
            }
            throw parseError;
          }
        } else {
          return {
            error: `域名 ${originalDomain} 未注册，该域名可供注册使用`,
            errorType: 'domain_not_found'
          };
        }
      } catch (error) {
        console.log(`Direct WHOIS failed for ${originalDomain}: ${error.message}`);
        errors.push(`WHOIS: ${error.message}`);
        
        if (error.message === 'domain_not_found') {
          return {
            error: `域名 ${originalDomain} 未注册，该域名可供注册使用`,
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
    
    if (errors.some(e => e.toLowerCase().includes('timeout') || e.toLowerCase().includes('connection'))) {
      return {
        error: `网络连接超时，请稍后重试`,
        errorType: 'network_error'
      };
    }
    
    const errorDetails = errors.map(e => {
      const parts = e.split(': ');
      return parts.length > 1 ? parts[1] : e;
    }).filter(Boolean);
    
    const errorMessage = errorDetails.length > 0 
      ? `查询失败：${errorDetails.join('，')}` 
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
    queryMethods: [results.primary?.source === 'rdap' ? `RDAP` : `WHOIS Direct (${WHOIS_SERVERS[tld]?.server})`],
    isIDN: isIDN(originalDomain),
    asciiDomain: asciiDomain !== originalDomain ? asciiDomain : undefined,
  };

  return results;
}

// 验证域名格式（支持IDN）
function isValidDomain(domain: string): boolean {
  const asciiPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  const idnPattern = /^[\p{L}\p{N}][\p{L}\p{N}\-]{0,61}[\p{L}\p{N}]?\.[\p{L}]{2,}$/u;
  const punycodePattern = /^xn--[a-z0-9-]+\.[a-z]{2,}$/i;
  
  return asciiPattern.test(domain) || idnPattern.test(domain) || punycodePattern.test(domain);
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

    const trimmedDomain = domain.trim().toLowerCase();
    
    if (!isValidDomain(trimmedDomain)) {
      return new Response(
        JSON.stringify({ 
          error: '域名格式无效，请输入有效的域名格式，如：example.com 或 中文.中国',
          errorType: 'invalid_format'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing domain lookup for: ${trimmedDomain}`);
    const result = await performDualLookup(trimmedDomain);

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
