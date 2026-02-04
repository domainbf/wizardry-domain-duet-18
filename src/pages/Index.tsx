import DomainLookup from '@/components/DomainLookup';
import { Sun, Moon, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

// 徽章配置：支持图片或纯文字显示
const PARTNER_BADGES = [
  { name: 'NIC.BN', url: 'https://nic.bn', image: '/logo.png', height: 'h-6' },
  { name: 'CHINA.TN', url: 'https://china.tn', image: '/heise.png', height: 'h-7' },
  { name: 'DOMAIN.BF', url: 'https://domain.bf', image: '/domainbf.png', height: 'h-5' },
  { name: 'X.RW', url: 'https://x.rw', image: '/x.rw.png', height: 'h-5' },
];

const Index = () => {
  const [isDark, setIsDark] = useState(false);
  const [badgeImageErrors, setBadgeImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleImageError = (name: string) => {
    setBadgeImageErrors(prev => ({ ...prev, [name]: true }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-2xl mx-auto px-4 py-8 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">RDAP 域名查询</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              输入域名或 IDN。我们将验证、规范化整理信息显示。如果 RDAP 不可用，将回退到 WHOIS。
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Languages className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Main Lookup Component */}
        <DomainLookup />
      </div>

      {/* Sticky Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          {/* Partner Badges */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <a 
              href="https://nic.bn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <img src="/logo.png" alt="NIC.BN" className="h-6 w-auto object-contain" />
            </a>
            <a 
              href="https://china.tn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <img src="/heise.png" alt="CHINA.TN" className="h-7 w-auto object-contain" />
            </a>
            <a 
              href="https://domain.bf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <img src="/domainbf.png" alt="DOMAIN.BF" className="h-5 w-auto object-contain" />
            </a>
            <a 
              href="https://x.rw" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <img src="/x.rw.png" alt="X.RW" className="h-5 w-auto object-contain" />
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground text-center">
            © 2026 不讲·李. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
