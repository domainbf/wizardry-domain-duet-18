import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== IDN / Punycode 支持 ====================
// 简化的 Punycode 编码实现
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
  
  // 收集基本字符
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
    return output; // 全是ASCII，无需编码
  }
  
  // 获取所有唯一的非基本码点并排序
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
    return String.fromCharCode(d + (d < 26 ? 97 : 22)); // a-z, 0-9
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

// 将域名转换为 Punycode（如果包含非ASCII字符）
function toASCII(domain: string): string {
  const parts = domain.split('.');
  const result: string[] = [];
  
  for (const part of parts) {
    // 检查是否包含非ASCII字符
    if (/[^\x00-\x7F]/.test(part)) {
      result.push('xn--' + punyEncode(part));
    } else {
      result.push(part);
    }
  }
  
  return result.join('.');
}

// 检测是否为 IDN 域名
function isIDN(domain: string): boolean {
  return /[^\x00-\x7F]/.test(domain) || domain.includes('xn--');
}

// ==================== 完整的WHOIS服务器列表 ====================
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
  'pro': { server: 'whois.registrypro.pro', port: 43 },
  'space': { server: 'whois.nic.space', port: 43 },
  'website': { server: 'whois.nic.website', port: 43 },
  'academy': { server: 'whois.nic.academy', port: 43 },
  'accountant': { server: 'whois.nic.accountant', port: 43 },
  'accountants': { server: 'whois.nic.accountants', port: 43 },
  'actor': { server: 'whois.nic.actor', port: 43 },
  'adult': { server: 'whois.nic.adult', port: 43 },
  'apartments': { server: 'whois.nic.apartments', port: 43 },
  'auto': { server: 'whois.nic.auto', port: 43 },
  'autos': { server: 'whois.nic.autos', port: 43 },
  'baby': { server: 'whois.nic.baby', port: 43 },
  'band': { server: 'whois.nic.band', port: 43 },
  'bar': { server: 'whois.nic.bar', port: 43 },
  'beer': { server: 'whois.nic.beer', port: 43 },
  'best': { server: 'whois.nic.best', port: 43 },
  'bet': { server: 'whois.nic.bet', port: 43 },
  'bid': { server: 'whois.nic.bid', port: 43 },
  'bike': { server: 'whois.nic.bike', port: 43 },
  'bingo': { server: 'whois.nic.bingo', port: 43 },
  'bio': { server: 'whois.nic.bio', port: 43 },
  'black': { server: 'whois.nic.black', port: 43 },
  'blue': { server: 'whois.nic.blue', port: 43 },
  'bond': { server: 'whois.nic.bond', port: 43 },
  'boutique': { server: 'whois.nic.boutique', port: 43 },
  'broker': { server: 'whois.nic.broker', port: 43 },
  'builders': { server: 'whois.nic.builders', port: 43 },
  'business': { server: 'whois.nic.business', port: 43 },
  'buzz': { server: 'whois.nic.buzz', port: 43 },
  'cab': { server: 'whois.nic.cab', port: 43 },
  'cafe': { server: 'whois.nic.cafe', port: 43 },
  'cam': { server: 'whois.nic.cam', port: 43 },
  'camera': { server: 'whois.nic.camera', port: 43 },
  'camp': { server: 'whois.nic.camp', port: 43 },
  'capital': { server: 'whois.nic.capital', port: 43 },
  'car': { server: 'whois.nic.car', port: 43 },
  'cards': { server: 'whois.nic.cards', port: 43 },
  'care': { server: 'whois.nic.care', port: 43 },
  'careers': { server: 'whois.nic.careers', port: 43 },
  'cars': { server: 'whois.nic.cars', port: 43 },
  'casa': { server: 'whois.nic.casa', port: 43 },
  'cash': { server: 'whois.nic.cash', port: 43 },
  'casino': { server: 'whois.nic.casino', port: 43 },
  'catering': { server: 'whois.nic.catering', port: 43 },
  'charity': { server: 'whois.nic.charity', port: 43 },
  'chat': { server: 'whois.nic.chat', port: 43 },
  'cheap': { server: 'whois.nic.cheap', port: 43 },
  'christmas': { server: 'whois.nic.christmas', port: 43 },
  'church': { server: 'whois.nic.church', port: 43 },
  'claims': { server: 'whois.nic.claims', port: 43 },
  'cleaning': { server: 'whois.nic.cleaning', port: 43 },
  'clinic': { server: 'whois.nic.clinic', port: 43 },
  'clothing': { server: 'whois.nic.clothing', port: 43 },
  'coach': { server: 'whois.nic.coach', port: 43 },
  'codes': { server: 'whois.nic.codes', port: 43 },
  'coffee': { server: 'whois.nic.coffee', port: 43 },
  'college': { server: 'whois.nic.college', port: 43 },
  'community': { server: 'whois.nic.community', port: 43 },
  'condos': { server: 'whois.nic.condos', port: 43 },
  'construction': { server: 'whois.nic.construction', port: 43 },
  'consulting': { server: 'whois.nic.consulting', port: 43 },
  'contact': { server: 'whois.nic.contact', port: 43 },
  'contractors': { server: 'whois.nic.contractors', port: 43 },
  'cooking': { server: 'whois.nic.cooking', port: 43 },
  'cool': { server: 'whois.nic.cool', port: 43 },
  'country': { server: 'whois.nic.country', port: 43 },
  'coupons': { server: 'whois.nic.coupons', port: 43 },
  'courses': { server: 'whois.nic.courses', port: 43 },
  'credit': { server: 'whois.nic.credit', port: 43 },
  'cricket': { server: 'whois.nic.cricket', port: 43 },
  'cruise': { server: 'whois.nic.cruise', port: 43 },
  'cruises': { server: 'whois.nic.cruises', port: 43 },
  'cyou': { server: 'whois.nic.cyou', port: 43 },
  'dance': { server: 'whois.nic.dance', port: 43 },
  'date': { server: 'whois.nic.date', port: 43 },
  'dating': { server: 'whois.nic.dating', port: 43 },
  'deals': { server: 'whois.nic.deals', port: 43 },
  'degree': { server: 'whois.nic.degree', port: 43 },
  'delivery': { server: 'whois.nic.delivery', port: 43 },
  'democrat': { server: 'whois.nic.democrat', port: 43 },
  'dental': { server: 'whois.nic.dental', port: 43 },
  'dentist': { server: 'whois.nic.dentist', port: 43 },
  'diamonds': { server: 'whois.nic.diamonds', port: 43 },
  'diet': { server: 'whois.nic.diet', port: 43 },
  'direct': { server: 'whois.nic.direct', port: 43 },
  'directory': { server: 'whois.nic.directory', port: 43 },
  'discount': { server: 'whois.nic.discount', port: 43 },
  'doctor': { server: 'whois.nic.doctor', port: 43 },
  'dog': { server: 'whois.nic.dog', port: 43 },
  'domains': { server: 'whois.nic.domains', port: 43 },
  'download': { server: 'whois.nic.download', port: 43 },
  'earth': { server: 'whois.nic.earth', port: 43 },
  'eco': { server: 'whois.nic.eco', port: 43 },
  'education': { server: 'whois.nic.education', port: 43 },
  'energy': { server: 'whois.nic.energy', port: 43 },
  'engineer': { server: 'whois.nic.engineer', port: 43 },
  'engineering': { server: 'whois.nic.engineering', port: 43 },
  'enterprises': { server: 'whois.nic.enterprises', port: 43 },
  'equipment': { server: 'whois.nic.equipment', port: 43 },
  'estate': { server: 'whois.nic.estate', port: 43 },
  'events': { server: 'whois.nic.events', port: 43 },
  'exchange': { server: 'whois.nic.exchange', port: 43 },
  'expert': { server: 'whois.nic.expert', port: 43 },
  'exposed': { server: 'whois.nic.exposed', port: 43 },
  'express': { server: 'whois.nic.express', port: 43 },
  'fail': { server: 'whois.nic.fail', port: 43 },
  'faith': { server: 'whois.nic.faith', port: 43 },
  'family': { server: 'whois.nic.family', port: 43 },
  'farm': { server: 'whois.nic.farm', port: 43 },
  'fashion': { server: 'whois.nic.fashion', port: 43 },
  'film': { server: 'whois.nic.film', port: 43 },
  'finance': { server: 'whois.nic.finance', port: 43 },
  'financial': { server: 'whois.nic.financial', port: 43 },
  'fish': { server: 'whois.nic.fish', port: 43 },
  'fishing': { server: 'whois.nic.fishing', port: 43 },
  'fit': { server: 'whois.nic.fit', port: 43 },
  'fitness': { server: 'whois.nic.fitness', port: 43 },
  'flights': { server: 'whois.nic.flights', port: 43 },
  'florist': { server: 'whois.nic.florist', port: 43 },
  'flowers': { server: 'whois.nic.flowers', port: 43 },
  'football': { server: 'whois.nic.football', port: 43 },
  'forex': { server: 'whois.nic.forex', port: 43 },
  'forsale': { server: 'whois.nic.forsale', port: 43 },
  'foundation': { server: 'whois.nic.foundation', port: 43 },
  'fund': { server: 'whois.nic.fund', port: 43 },
  'furniture': { server: 'whois.nic.furniture', port: 43 },
  'futbol': { server: 'whois.nic.futbol', port: 43 },
  'fyi': { server: 'whois.nic.fyi', port: 43 },
  'gallery': { server: 'whois.nic.gallery', port: 43 },
  'garden': { server: 'whois.nic.garden', port: 43 },
  'gay': { server: 'whois.nic.gay', port: 43 },
  'gives': { server: 'whois.nic.gives', port: 43 },
  'glass': { server: 'whois.nic.glass', port: 43 },
  'gmbh': { server: 'whois.nic.gmbh', port: 43 },
  'gold': { server: 'whois.nic.gold', port: 43 },
  'golf': { server: 'whois.nic.golf', port: 43 },
  'graphics': { server: 'whois.nic.graphics', port: 43 },
  'gratis': { server: 'whois.nic.gratis', port: 43 },
  'green': { server: 'whois.nic.green', port: 43 },
  'gripe': { server: 'whois.nic.gripe', port: 43 },
  'guide': { server: 'whois.nic.guide', port: 43 },
  'guru': { server: 'whois.nic.guru', port: 43 },
  'hair': { server: 'whois.nic.hair', port: 43 },
  'haus': { server: 'whois.nic.haus', port: 43 },
  'health': { server: 'whois.nic.health', port: 43 },
  'healthcare': { server: 'whois.nic.healthcare', port: 43 },
  'hockey': { server: 'whois.nic.hockey', port: 43 },
  'holdings': { server: 'whois.nic.holdings', port: 43 },
  'holiday': { server: 'whois.nic.holiday', port: 43 },
  'home': { server: 'whois.nic.home', port: 43 },
  'homes': { server: 'whois.nic.homes', port: 43 },
  'horse': { server: 'whois.nic.horse', port: 43 },
  'hospital': { server: 'whois.nic.hospital', port: 43 },
  'host': { server: 'whois.nic.host', port: 43 },
  'hosting': { server: 'whois.nic.hosting', port: 43 },
  'house': { server: 'whois.nic.house', port: 43 },
  'immo': { server: 'whois.nic.immo', port: 43 },
  'immobilien': { server: 'whois.nic.immobilien', port: 43 },
  'industries': { server: 'whois.nic.industries', port: 43 },
  'ink': { server: 'whois.nic.ink', port: 43 },
  'institute': { server: 'whois.nic.institute', port: 43 },
  'insure': { server: 'whois.nic.insure', port: 43 },
  'investments': { server: 'whois.nic.investments', port: 43 },
  'irish': { server: 'whois.nic.irish', port: 43 },
  'jetzt': { server: 'whois.nic.jetzt', port: 43 },
  'jewelry': { server: 'whois.nic.jewelry', port: 43 },
  'juegos': { server: 'whois.nic.juegos', port: 43 },
  'kaufen': { server: 'whois.nic.kaufen', port: 43 },
  'kim': { server: 'whois.nic.kim', port: 43 },
  'kitchen': { server: 'whois.nic.kitchen', port: 43 },
  'kiwi': { server: 'whois.nic.kiwi', port: 43 },
  'land': { server: 'whois.nic.land', port: 43 },
  'lat': { server: 'whois.nic.lat', port: 43 },
  'lawyer': { server: 'whois.nic.lawyer', port: 43 },
  'lease': { server: 'whois.nic.lease', port: 43 },
  'legal': { server: 'whois.nic.legal', port: 43 },
  'lgbt': { server: 'whois.nic.lgbt', port: 43 },
  'lighting': { server: 'whois.nic.lighting', port: 43 },
  'limited': { server: 'whois.nic.limited', port: 43 },
  'limo': { server: 'whois.nic.limo', port: 43 },
  'loan': { server: 'whois.nic.loan', port: 43 },
  'loans': { server: 'whois.nic.loans', port: 43 },
  'lotto': { server: 'whois.nic.lotto', port: 43 },
  'love': { server: 'whois.nic.love', port: 43 },
  'luxe': { server: 'whois.nic.luxe', port: 43 },
  'luxury': { server: 'whois.nic.luxury', port: 43 },
  'maison': { server: 'whois.nic.maison', port: 43 },
  'makeup': { server: 'whois.nic.makeup', port: 43 },
  'management': { server: 'whois.nic.management', port: 43 },
  'market': { server: 'whois.nic.market', port: 43 },
  'marketing': { server: 'whois.nic.marketing', port: 43 },
  'markets': { server: 'whois.nic.markets', port: 43 },
  'mba': { server: 'whois.nic.mba', port: 43 },
  'memorial': { server: 'whois.nic.memorial', port: 43 },
  'men': { server: 'whois.nic.men', port: 43 },
  'menu': { server: 'whois.nic.menu', port: 43 },
  'mobile': { server: 'whois.nic.mobile', port: 43 },
  'moda': { server: 'whois.nic.moda', port: 43 },
  'moe': { server: 'whois.nic.moe', port: 43 },
  'money': { server: 'whois.nic.money', port: 43 },
  'monster': { server: 'whois.nic.monster', port: 43 },
  'mortgage': { server: 'whois.nic.mortgage', port: 43 },
  'motorcycles': { server: 'whois.nic.motorcycles', port: 43 },
  'movie': { server: 'whois.nic.movie', port: 43 },
  'nagoya': { server: 'whois.nic.nagoya', port: 43 },
  'navy': { server: 'whois.nic.navy', port: 43 },
  'news': { server: 'whois.nic.news', port: 43 },
  'ninja': { server: 'whois.nic.ninja', port: 43 },
  'observer': { server: 'whois.nic.observer', port: 43 },
  'one': { server: 'whois.nic.one', port: 43 },
  'ooo': { server: 'whois.nic.ooo', port: 43 },
  'osaka': { server: 'whois.nic.osaka', port: 43 },
  'paris': { server: 'whois.nic.paris', port: 43 },
  'partners': { server: 'whois.nic.partners', port: 43 },
  'parts': { server: 'whois.nic.parts', port: 43 },
  'party': { server: 'whois.nic.party', port: 43 },
  'pet': { server: 'whois.nic.pet', port: 43 },
  'photography': { server: 'whois.nic.photography', port: 43 },
  'photos': { server: 'whois.nic.photos', port: 43 },
  'physio': { server: 'whois.nic.physio', port: 43 },
  'pictures': { server: 'whois.nic.pictures', port: 43 },
  'pink': { server: 'whois.nic.pink', port: 43 },
  'pizza': { server: 'whois.nic.pizza', port: 43 },
  'place': { server: 'whois.nic.place', port: 43 },
  'plumbing': { server: 'whois.nic.plumbing', port: 43 },
  'poker': { server: 'whois.nic.poker', port: 43 },
  'porn': { server: 'whois.nic.porn', port: 43 },
  'press': { server: 'whois.nic.press', port: 43 },
  'productions': { server: 'whois.nic.productions', port: 43 },
  'promo': { server: 'whois.nic.promo', port: 43 },
  'properties': { server: 'whois.nic.properties', port: 43 },
  'property': { server: 'whois.nic.property', port: 43 },
  'protection': { server: 'whois.nic.protection', port: 43 },
  'pub': { server: 'whois.nic.pub', port: 43 },
  'quest': { server: 'whois.nic.quest', port: 43 },
  'racing': { server: 'whois.nic.racing', port: 43 },
  'realestate': { server: 'whois.nic.realestate', port: 43 },
  'realty': { server: 'whois.nic.realty', port: 43 },
  'recipes': { server: 'whois.nic.recipes', port: 43 },
  'red': { server: 'whois.nic.red', port: 43 },
  'rehab': { server: 'whois.nic.rehab', port: 43 },
  'reisen': { server: 'whois.nic.reisen', port: 43 },
  'rent': { server: 'whois.nic.rent', port: 43 },
  'rentals': { server: 'whois.nic.rentals', port: 43 },
  'repair': { server: 'whois.nic.repair', port: 43 },
  'report': { server: 'whois.nic.report', port: 43 },
  'republican': { server: 'whois.nic.republican', port: 43 },
  'rest': { server: 'whois.nic.rest', port: 43 },
  'restaurant': { server: 'whois.nic.restaurant', port: 43 },
  'review': { server: 'whois.nic.review', port: 43 },
  'reviews': { server: 'whois.nic.reviews', port: 43 },
  'rich': { server: 'whois.nic.rich', port: 43 },
  'rip': { server: 'whois.nic.rip', port: 43 },
  'rocks': { server: 'whois.nic.rocks', port: 43 },
  'rodeo': { server: 'whois.nic.rodeo', port: 43 },
  'run': { server: 'whois.nic.run', port: 43 },
  'sale': { server: 'whois.nic.sale', port: 43 },
  'salon': { server: 'whois.nic.salon', port: 43 },
  'sarl': { server: 'whois.nic.sarl', port: 43 },
  'school': { server: 'whois.nic.school', port: 43 },
  'schule': { server: 'whois.nic.schule', port: 43 },
  'science': { server: 'whois.nic.science', port: 43 },
  'security': { server: 'whois.nic.security', port: 43 },
  'services': { server: 'whois.nic.services', port: 43 },
  'sex': { server: 'whois.nic.sex', port: 43 },
  'sexy': { server: 'whois.nic.sexy', port: 43 },
  'shiksha': { server: 'whois.nic.shiksha', port: 43 },
  'shoes': { server: 'whois.nic.shoes', port: 43 },
  'shopping': { server: 'whois.nic.shopping', port: 43 },
  'show': { server: 'whois.nic.show', port: 43 },
  'singles': { server: 'whois.nic.singles', port: 43 },
  'ski': { server: 'whois.nic.ski', port: 43 },
  'skin': { server: 'whois.nic.skin', port: 43 },
  'soccer': { server: 'whois.nic.soccer', port: 43 },
  'social': { server: 'whois.nic.social', port: 43 },
  'software': { server: 'whois.nic.software', port: 43 },
  'solar': { server: 'whois.nic.solar', port: 43 },
  'spa': { server: 'whois.nic.spa', port: 43 },
  'sport': { server: 'whois.nic.sport', port: 43 },
  'spot': { server: 'whois.nic.spot', port: 43 },
  'srl': { server: 'whois.nic.srl', port: 43 },
  'storage': { server: 'whois.nic.storage', port: 43 },
  'stream': { server: 'whois.nic.stream', port: 43 },
  'style': { server: 'whois.nic.style', port: 43 },
  'sucks': { server: 'whois.nic.sucks', port: 43 },
  'supplies': { server: 'whois.nic.supplies', port: 43 },
  'supply': { server: 'whois.nic.supply', port: 43 },
  'support': { server: 'whois.nic.support', port: 43 },
  'surf': { server: 'whois.nic.surf', port: 43 },
  'surgery': { server: 'whois.nic.surgery', port: 43 },
  'tattoo': { server: 'whois.nic.tattoo', port: 43 },
  'tax': { server: 'whois.nic.tax', port: 43 },
  'taxi': { server: 'whois.nic.taxi', port: 43 },
  'team': { server: 'whois.nic.team', port: 43 },
  'theater': { server: 'whois.nic.theater', port: 43 },
  'theatre': { server: 'whois.nic.theatre', port: 43 },
  'tienda': { server: 'whois.nic.tienda', port: 43 },
  'tips': { server: 'whois.nic.tips', port: 43 },
  'tires': { server: 'whois.nic.tires', port: 43 },
  'tokyo': { server: 'whois.nic.tokyo', port: 43 },
  'tools': { server: 'whois.nic.tools', port: 43 },
  'tours': { server: 'whois.nic.tours', port: 43 },
  'town': { server: 'whois.nic.town', port: 43 },
  'toys': { server: 'whois.nic.toys', port: 43 },
  'trade': { server: 'whois.nic.trade', port: 43 },
  'trading': { server: 'whois.nic.trading', port: 43 },
  'training': { server: 'whois.nic.training', port: 43 },
  'tube': { server: 'whois.nic.tube', port: 43 },
  'university': { server: 'whois.nic.university', port: 43 },
  'uno': { server: 'whois.nic.uno', port: 43 },
  'vacations': { server: 'whois.nic.vacations', port: 43 },
  'vegas': { server: 'whois.nic.vegas', port: 43 },
  'ventures': { server: 'whois.nic.ventures', port: 43 },
  'vet': { server: 'whois.nic.vet', port: 43 },
  'viajes': { server: 'whois.nic.viajes', port: 43 },
  'video': { server: 'whois.nic.video', port: 43 },
  'villas': { server: 'whois.nic.villas', port: 43 },
  'vin': { server: 'whois.nic.vin', port: 43 },
  'vision': { server: 'whois.nic.vision', port: 43 },
  'vodka': { server: 'whois.nic.vodka', port: 43 },
  'vote': { server: 'whois.nic.vote', port: 43 },
  'voting': { server: 'whois.nic.voting', port: 43 },
  'voto': { server: 'whois.nic.voto', port: 43 },
  'voyage': { server: 'whois.nic.voyage', port: 43 },
  'wales': { server: 'whois.nic.wales', port: 43 },
  'watch': { server: 'whois.nic.watch', port: 43 },
  'webcam': { server: 'whois.nic.webcam', port: 43 },
  'wedding': { server: 'whois.nic.wedding', port: 43 },
  'wiki': { server: 'whois.nic.wiki', port: 43 },
  'win': { server: 'whois.nic.win', port: 43 },
  'wine': { server: 'whois.nic.wine', port: 43 },
  'works': { server: 'whois.nic.works', port: 43 },
  'wtf': { server: 'whois.nic.wtf', port: 43 },
  'yoga': { server: 'whois.nic.yoga', port: 43 },
  'yokohama': { server: 'whois.nic.yokohama', port: 43 },
  
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
  
  // =============== 国家/地区顶级域名 (ccTLD) - 亚洲 ===============
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
  'mm': { server: 'whois.nic.mm', port: 43 },
  'bn': { server: 'whois.bnnic.bn', port: 43 },
  'bt': { server: 'whois.nic.bt', port: 43 },
  'kh': { server: 'whois.nic.kh', port: 43 },
  'la': { server: 'whois.nic.la', port: 43 },
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
  'iq': { server: 'whois.cmc.iq', port: 43 },
  'kw': { server: 'whois.nic.kw', port: 43 },
  'bh': { server: 'whois.nic.bh', port: 43 },
  'qa': { server: 'whois.registry.qa', port: 43 },
  'om': { server: 'whois.registry.om', port: 43 },
  'ye': { server: 'whois.y.net.ye', port: 43 },
  'ps': { server: 'whois.pnina.ps', port: 43 },
  
  // =============== 国家/地区顶级域名 (ccTLD) - 欧洲 ===============
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
  'me': { server: 'whois.nic.me', port: 43 },
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
  
  // =============== 国家/地区顶级域名 (ccTLD) - 美洲 ===============
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
  'cw': { server: 'whois.nic.cw', port: 43 },
  'sx': { server: 'whois.sx', port: 43 },
  'bq': { server: 'whois.nic.bq', port: 43 },
  'ai': { server: 'whois.nic.ai', port: 43 },
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
  
  // =============== 国家/地区顶级域名 (ccTLD) - 大洋洲 ===============
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
  'as': { server: 'whois.nic.as', port: 43 },
  'gu': { server: 'whois.nic.gu', port: 43 },
  'mp': { server: 'whois.nic.mp', port: 43 },
  'mh': { server: 'whois.nic.mh', port: 43 },
  'nr': { server: 'whois.nic.nr', port: 43 },
  'pn': { server: 'whois.nic.pn', port: 43 },
  'nc': { server: 'whois.nc', port: 43 },
  'pf': { server: 'whois.registry.pf', port: 43 },
  'wf': { server: 'whois.nic.wf', port: 43 },
  'tf': { server: 'whois.nic.tf', port: 43 },
  'nf': { server: 'whois.nic.nf', port: 43 },
  'cx': { server: 'whois.nic.cx', port: 43 },
  'cc': { server: 'whois.nic.cc', port: 43 },
  'hm': { server: 'whois.registry.hm', port: 43 },
  
  // =============== 国家/地区顶级域名 (ccTLD) - 非洲 ===============
  'za': { server: 'whois.registry.net.za', port: 43 },
  'ng': { server: 'whois.nic.net.ng', port: 43 },
  'ke': { server: 'whois.kenic.or.ke', port: 43 },
  'eg': { server: 'whois.ripe.net', port: 43 },
  'ma': { server: 'whois.registre.ma', port: 43 },
  'tn': { server: 'whois.ati.tn', port: 43 },
  'gh': { server: 'whois.nic.gh', port: 43 },
  'ug': { server: 'whois.co.ug', port: 43 },
  'tz': { server: 'whois.nic.tz', port: 43 },
  'rw': { server: 'whois.ricta.org.rw', port: 43 },
  'et': { server: 'whois.ethiotelecom.et', port: 43 },
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
  'ly': { server: 'whois.nic.ly', port: 43 },
  'dz': { server: 'whois.nic.dz', port: 43 },
  'sd': { server: 'whois.nic.sd', port: 43 },
  'ss': { server: 'whois.nic.ss', port: 43 },
  'io': { server: 'whois.nic.io', port: 43 },
  'sh': { server: 'whois.nic.sh', port: 43 },
  'ac': { server: 'whois.nic.ac', port: 43 },
  'gs': { server: 'whois.nic.gs', port: 43 },
  
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
  'co.kr': { server: 'whois.kr', port: 43 },
  'or.kr': { server: 'whois.kr', port: 43 },
  'ne.kr': { server: 'whois.kr', port: 43 },
  'co.nz': { server: 'whois.srs.net.nz', port: 43 },
  'net.nz': { server: 'whois.srs.net.nz', port: 43 },
  'org.nz': { server: 'whois.srs.net.nz', port: 43 },
  'govt.nz': { server: 'whois.srs.net.nz', port: 43 },
  'co.za': { server: 'whois.registry.net.za', port: 43 },
  'org.za': { server: 'whois.registry.net.za', port: 43 },
  'net.za': { server: 'whois.registry.net.za', port: 43 },
  'com.br': { server: 'whois.registro.br', port: 43 },
  'net.br': { server: 'whois.registro.br', port: 43 },
  'org.br': { server: 'whois.registro.br', port: 43 },
  'com.mx': { server: 'whois.mx', port: 43 },
  'org.mx': { server: 'whois.mx', port: 43 },
  'gob.mx': { server: 'whois.mx', port: 43 },
  'com.ar': { server: 'whois.nic.ar', port: 43 },
  'org.ar': { server: 'whois.nic.ar', port: 43 },
  'gob.ar': { server: 'whois.nic.ar', port: 43 },
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
  'xyz': 'https://rdap.nic.xyz',
  'top': 'https://rdap.nic.top',
  'club': 'https://rdap.nic.club',
  'online': 'https://rdap.centralnic.com/online',
  'site': 'https://rdap.centralnic.com/site',
  'tech': 'https://rdap.centralnic.com/tech',
  'store': 'https://rdap.centralnic.com/store',
  'fun': 'https://rdap.centralnic.com/fun',
  'icu': 'https://rdap.centralnic.com/icu',
  'vip': 'https://rdap.centralnic.com/vip',
  'shop': 'https://rdap.centralnic.com/shop',
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
    
    // 检查是否有二级域名的WHOIS服务器
    const potentialSecondLevel = `${sld}.${tld}`;
    if (WHOIS_SERVERS[potentialSecondLevel]) {
      return potentialSecondLevel;
    }
    
    // 处理常见的二级域名
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

// 直接TCP连接WHOIS服务器查询（优化超时）
async function queryWhoisDirect(domain: string, timeout: number = 10000): Promise<string> {
  const tld = getTLD(domain);
  const serverInfo = WHOIS_SERVERS[tld];
  
  if (!serverInfo) {
    throw new Error(`No WHOIS server found for .${tld} domains`);
  }
  
  console.log(`Connecting to WHOIS server: ${serverInfo.server}:${serverInfo.port} for ${domain}`);
  
  try {
    // 使用Deno的TCP连接（带连接超时）
    const connectPromise = Deno.connect({
      hostname: serverInfo.server,
      port: serverInfo.port,
    });
    
    const connectTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), timeout / 2);
    });
    
    const conn = await Promise.race([connectPromise, connectTimeoutPromise]) as Deno.Conn;
    
    // 处理 IDN 域名 - 转换为 Punycode
    let queryDomain = domain;
    if (isIDN(domain)) {
      queryDomain = toASCII(domain);
      console.log(`IDN domain converted: ${domain} -> ${queryDomain}`);
    }
    
    // 构建查询字符串
    const queryPrefix = serverInfo.query || '';
    const queryString = `${queryPrefix}${queryDomain}\r\n`;
    
    console.log(`Sending WHOIS query: ${queryString.trim()}`);
    
    // 发送查询
    const encoder = new TextEncoder();
    await conn.write(encoder.encode(queryString));
    
    // 读取响应
    const decoder = new TextDecoder(serverInfo.encoding || 'utf-8');
    const chunks: Uint8Array[] = [];
    const buffer = new Uint8Array(8192); // 增大缓冲区
    
    // 设置读取超时
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

  // 处理 IDN 域名
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
    return parseRDAPResponse(data, domain); // 传入原始域名用于显示
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
  // 英文通用
  'no match for domain', 'not found', 'no data found',
  'domain is not registered', 'available for registration', 
  'status: free', 'status: available', 'no entries found',
  'nothing found', 'object does not exist', 'domain not found', 
  'no object found', 'the queried object does not exist', 
  'not been registered', 'no matching record', 'domain is available',
  'this domain name has not been registered', 'domain status: free',
  'the domain has not been registered', 'domain name not known',
  'no match', 'domain name is not registered', 'unregistered',
  // 中文
  '该域名未注册', '域名未注册', '未注册', '可以注册',
  '没有找到匹配的记录', '无匹配记录', '域名不存在',
  // 日文
  'no registered', 'ドメイン名は登録されていません',
  // 其他
  'nothing to display', 'no information available',
  'domain available', 'is free', 'not registered',
];

// 解析WHOIS文本响应（增强版）
function parseWhoisText(text: string, domain: string): any {
  // 记录原始响应以便调试
  console.log(`Parsing WHOIS response for ${domain}, length: ${text.length}`);
  
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
  
  // 首先检查是否有注册信息
  let hasRegistrarInfo = false;
  let hasValidDates = false;
  let hasNameServers = false;
  
  // 增强的注册商识别正则（支持多种语言格式，按优先级排序）
  // 高优先级模式（精确匹配 registrar）
  const registrarPrimaryPatterns = [
    /^registrar:\s*(.+)/i,
    /^sponsoring registrar:\s*(.+)/i,
    /^registrar name:\s*(.+)/i,
    /^registrar organization:\s*(.+)/i,
    /^注册商:\s*(.+)/i,
    /^域名注册商:\s*(.+)/i,
    /^bureau d'enregistrement:\s*(.+)/i,  // 法语
    /^registraire:\s*(.+)/i,               // 法语
    /^registro:\s*(.+)/i,                  // 西班牙语/葡萄牙语
    /^registrador:\s*(.+)/i,               // 西班牙语
    /^レジストラ:\s*(.+)/i,                // 日语
    /^등록대행자:\s*(.+)/i,                // 韩语
    /^регистратор:\s*(.+)/i,              // 俄语
  ];
  
  // 低优先级模式（可能匹配到其他信息，仅在高优先级失败时使用）
  const registrarSecondaryPatterns = [
    /^registrant name:\s*(.+)/i,
    /^holder:\s*(.+)/i,
    /^domain holder:\s*(.+)/i,
    /^owner:\s*(.+)/i,
    /^titulaire:\s*(.+)/i,                 // 法语
    /^registrante:\s*(.+)/i,               // 意大利语
    /^登録者:\s*(.+)/i,                    // 日语
  ];
  
  // 跳过的区块标记（这些区块内的数据不应作为主要域名信息）
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
    /date de création:\s*(.+)/i,          // 法语
    /créé le:\s*(.+)/i,                   // 法语
    /fecha de creación:\s*(.+)/i,         // 西班牙语
    /fecha de registro:\s*(.+)/i,         // 西班牙语
    /data de criação:\s*(.+)/i,           // 葡萄牙语
    /data de registro:\s*(.+)/i,          // 葡萄牙语
    /登録年月日:\s*(.+)/i,                // 日语
    /作成日:\s*(.+)/i,                    // 日语
    /등록일:\s*(.+)/i,                    // 韩语
    /дата регистрации:\s*(.+)/i,         // 俄语
    /created-date:\s*(.+)/i,
    /first registered:\s*(.+)/i,
    /domain create:\s*(.+)/i,
    /anniversary date:\s*(.+)/i,
    /initial registration:\s*(.+)/i,
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
    /date d'expiration:\s*(.+)/i,         // 法语
    /expire le:\s*(.+)/i,                 // 法语
    /fecha de expiración:\s*(.+)/i,       // 西班牙语
    /fecha de vencimiento:\s*(.+)/i,      // 西班牙语
    /data de expiração:\s*(.+)/i,         // 葡萄牙语
    /data de validade:\s*(.+)/i,          // 葡萄牙语
    /有効期限:\s*(.+)/i,                  // 日语
    /満了日:\s*(.+)/i,                    // 日语
    /만료일:\s*(.+)/i,                    // 韩语
    /дата окончания:\s*(.+)/i,           // 俄语
    /expired:\s*(.+)/i,
    /expiry:\s*(.+)/i,
    /due date:\s*(.+)/i,
  ];
  
  const updateDatePatterns = [
    /updated date:\s*(.+)/i,
    /updated:\s*(.+)/i,
    /updated on:\s*(.+)/i,
    /last updated:\s*(.+)/i,
    /last updated on:\s*(.+)/i,
    /last update:\s*(.+)/i,
    /last modification:\s*(.+)/i,
    /last modified:\s*(.+)/i,
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
    /最終更新:\s*(.+)/i,                  // 日语
    /date de modification:\s*(.+)/i,      // 法语
    /dernière modification:\s*(.+)/i,     // 法语 (塞内加尔格式)
    /fecha de actualización:\s*(.+)/i,    // 西班牙语
    /data de atualização:\s*(.+)/i,       // 葡萄牙语
    /дата обновления:\s*(.+)/i,          // 俄语
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
    /serveur dns:\s*(.+)/i,               // 法语
    /serveur de noms:\s*(.+)/i,           // 法语 (塞内加尔格式)
    /servidor dns:\s*(.+)/i,              // 西班牙语/葡萄牙语
    /ネームサーバ:\s*(.+)/i,              // 日语
    /네임서버:\s*(.+)/i,                  // 韩语
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
    /statut:\s*(.+)/i,                    // 法语
    /estado:\s*(.+)/i,                    // 西班牙语/葡萄牙语
    /ステータス:\s*(.+)/i,                // 日语
    /상태:\s*(.+)/i,                      // 韩语
  ];
  
  let inSkipBlock = false;
  let primaryRegistrarFound = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%') || trimmed.startsWith('#') || trimmed.startsWith('>>>')) {
      continue;
    }
    
    // 检测全局字段（这些字段不属于联系人区块，应始终解析）
    const isGlobalField = trimmed.match(/^(serveur de noms|name\s*server|nameserver|nserver|dns|dnssec|statut|status)/i);
    
    // 如果是全局字段，退出跳过模式
    if (isGlobalField) {
      inSkipBlock = false;
    }
    
    // 检测并跳过联系人区块
    if (skipBlockMarkers.some(marker => trimmed.toUpperCase().includes(marker))) {
      inSkipBlock = true;
      continue;
    }
    
    // 空行可能结束跳过状态
    if (!trimmed.includes(':') && inSkipBlock) {
      // 保持跳过状态，直到遇到全局字段
      continue;
    }
    
    // 在跳过区块内，只跳过注册商相关解析，但仍解析全局字段
    const skipRegistrarParsing = inSkipBlock && !isGlobalField;
    
    // 注册商信息（高优先级）- 只在非跳过区块内解析
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
    
    // 注册商信息（低优先级，仅在未找到主要匹配时）- 只在非跳过区块内解析
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
    
    // 更新日期
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
    
    // DNS服务器（增强解析）
    for (const pattern of nameServerPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        // 分割可能包含多个NS的值（如 "ns1.example.com, ns2.example.com"）
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
    
    // 额外的 NS 检测：检查独立的 FQDN 行（某些 WHOIS 格式）
    if (trimmed.match(/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i) && 
        !trimmed.includes(':') && 
        !trimmed.includes(' ') &&
        trimmed.length > 5 &&
        trimmed.length < 100) {
      const potentialNs = trimmed.toLowerCase();
      // 检查是否看起来像 NS（包含 ns, dns, name 等）
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
        // 分割多个状态
        const statuses = statusText.split(/[,;\s]+/).filter(s => s.length > 0);
        statuses.forEach(status => {
          // 去掉URL后缀
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
        // 明确检查启用状态
        const enabledIndicators = ['signed', 'yes', 'enabled', 'active', '是', 'oui', 'signée'];
        const disabledIndicators = ['unsigned', 'no', 'disabled', 'inactive', '否', 'non', 'not signed'];
        
        if (disabledIndicators.some(ind => dnssecValue.includes(ind))) {
          result.dnssec = false;
        } else if (enabledIndicators.some(ind => dnssecValue.includes(ind))) {
          result.dnssec = true;
        }
      }
    }
    
    // 注册人信息
    const registrantNameMatch = trimmed.match(/registrant(?:\s+name)?:\s*(.+)/i);
    if (registrantNameMatch && registrantNameMatch[1]) {
      const value = registrantNameMatch[1].trim();
      if (value && value !== '-' && value.length > 1) {
        result.registrant.name = value;
      }
    }
    
    const registrantOrgMatch = trimmed.match(/registrant\s+org(?:anization)?:\s*(.+)/i);
    if (registrantOrgMatch && registrantOrgMatch[1]) {
      const value = registrantOrgMatch[1].trim();
      if (value && value !== '-') {
        result.registrant.organization = value;
      }
    }
    
    const registrantCountryMatch = trimmed.match(/registrant\s+country:\s*(.+)/i);
    if (registrantCountryMatch && registrantCountryMatch[1]) {
      const value = registrantCountryMatch[1].trim();
      if (value && value !== '-') {
        result.registrant.country = value;
      }
    }
  }
  
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
    // 清理日期字符串
    let cleanDateStr = dateStr
      .replace(/\s*\(.*?\)/g, '')  // 移除括号内容
      .replace(/\s*UTC.*/i, '')     // 移除UTC后缀
      .replace(/\s*GMT.*/i, '')     // 移除GMT后缀
      .replace(/\s*\+\d{2}:\d{2}.*/, '') // 移除时区偏移
      .replace(/\s*[+-]\d{4}.*/, '')     // 移除时区偏移格式2
      .replace(/T/, ' ')            // T替换为空格
      .replace(/Z$/, '')            // 移除Z后缀
      .replace(/\s+/g, ' ')         // 规范化空格
      .trim();
    
    // 扩展的月份名称映射（支持多语言）
    const monthMap: Record<string, number> = {
      // 英文
      'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
      'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
      'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
      'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12,
      // 法语
      'janvier': 1, 'février': 2, 'fevrier': 2, 'mars': 3, 'avril': 4, 'mai': 5,
      'juin': 6, 'juillet': 7, 'août': 8, 'aout': 8, 'septembre': 9, 'octobre': 10,
      'novembre': 11, 'décembre': 12, 'decembre': 12,
      // 西班牙语
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
      'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
      // 葡萄牙语
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'maio': 5, 'junho': 6,
      'julho': 7, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
      // 德语
      'januar': 1, 'februar': 2, 'marz': 3, 'märz': 3, 'juni': 6, 'juli': 7,
      'oktober': 10, 'dezember': 12,
      // 意大利语
      'gennaio': 1, 'febbraio': 2, 'aprile': 4, 'maggio': 5, 'giugno': 6,
      'luglio': 7, 'settembre': 9, 'ottobre': 10, 'dicembre': 12,
    };
    
    // 尝试各种日期格式的正则匹配
    const datePatterns = [
      // ISO格式 (YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD)
      { pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/, order: 'ymd' },
      { pattern: /(\d{4})\.(\d{1,2})\.(\d{1,2})/, order: 'ymd' },
      { pattern: /(\d{4})\/(\d{1,2})\/(\d{1,2})/, order: 'ymd' },
      // 紧凑格式 YYYYMMDD
      { pattern: /^(\d{4})(\d{2})(\d{2})$/, order: 'ymd' },
      // 美式格式 MM/DD/YYYY, MM-DD-YYYY
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, order: 'mdy' },
      { pattern: /(\d{1,2})-(\d{1,2})-(\d{4})/, order: 'mdy' },
      // 欧式格式 DD.MM.YYYY, DD/MM/YYYY
      { pattern: /(\d{1,2})\.(\d{1,2})\.(\d{4})/, order: 'dmy' },
      // 中文格式
      { pattern: /(\d{4})年(\d{1,2})月(\d{1,2})日/, order: 'ymd' },
      // 日文格式
      { pattern: /(\d{4})年(\d{1,2})月(\d{1,2})日/, order: 'ymd' },
      // 英文日期格式 "DD Mon YYYY", "DD Month YYYY"
      { pattern: /(\d{1,2})\s+([a-zA-Zéûàç]+)\s+(\d{4})/i, order: 'dmy_text' },
      // 英文日期格式 "Mon DD, YYYY", "Month DD YYYY"
      { pattern: /([a-zA-Zéûàç]+)\s+(\d{1,2}),?\s+(\d{4})/i, order: 'mdy_text' },
      // 英文日期格式 "DD-Mon-YYYY"
      { pattern: /(\d{1,2})-([a-zA-Z]+)-(\d{4})/i, order: 'dmy_text' },
      // 英文日期格式 "YYYY-Mon-DD"
      { pattern: /(\d{4})-([a-zA-Z]+)-(\d{1,2})/i, order: 'ymd_text' },
      // 纯数字格式尝试解析 DD/MM/YY 或 MM/DD/YY (假设2位年份)
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{2})$/, order: 'dmy_short' },
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
            const shortYear = parseInt(match[3]);
            year = String(shortYear > 50 ? 1900 + shortYear : 2000 + shortYear);
            break;
          }
          default:
            continue;
        }
        
        if (year && month && day) {
          const y = parseInt(year);
          const m = parseInt(month);
          const d = parseInt(day);
          
          // 验证日期有效性
          if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return `${year}年${String(m).padStart(2, '0')}月${String(d).padStart(2, '0')}日`;
          }
        }
      }
    }
    
    // 尝试直接用 Date 解析
    const date = new Date(cleanDateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      if (year >= 1990 && year <= 2100) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}年${month}月${day}日`;
      }
    }
    
    // 无法解析，返回原始字符串（如果看起来像日期）
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
  
  // 检查响应长度 - 太短通常表示未注册
  if (whoisText.length < 50) {
    return true;
  }
  
  // 检查未注册关键词
  if (NOT_FOUND_INDICATORS.some(indicator => textLower.includes(indicator))) {
    // 但要确认没有注册信息
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
  
  // 处理 IDN 域名
  const originalDomain = domain;
  const asciiDomain = isIDN(domain) ? toASCII(domain) : domain;
  const tld = getTLD(asciiDomain);

  console.log(`Starting lookup for ${originalDomain} (ASCII: ${asciiDomain}, TLD: ${tld})`);

  // 1. 首先尝试RDAP查询（如果支持）
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
      
      // 如果RDAP返回域名未找到，直接返回
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
        
        // 检查域名是否未注册
        if (checkNotRegistered(whoisText, originalDomain)) {
          return {
            error: `域名 ${originalDomain} 未注册，该域名可供注册使用`,
            errorType: 'domain_not_found'
          };
        }
        
        if (whoisText && whoisText.length > 20) {
          try {
            const whoisResult = parseWhoisText(whoisText, originalDomain);
            if (whoisResult && (whoisResult.registrar !== 'Unknown' || 
                whoisResult.registrationDate || whoisResult.nameServers.length > 0)) {
              results.primary = whoisResult;
              console.log(`WHOIS lookup successful for ${originalDomain}`);
            } else {
              // 解析成功但没有有效数据
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
          // 响应太短
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
    
    // 提供更清晰的错误信息
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
  // ASCII域名验证
  const asciiPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  // IDN域名验证 - 允许Unicode字符
  const idnPattern = /^[\p{L}\p{N}][\p{L}\p{N}\-]{0,61}[\p{L}\p{N}]?\.[\p{L}]{2,}$/u;
  // Punycode域名验证
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
