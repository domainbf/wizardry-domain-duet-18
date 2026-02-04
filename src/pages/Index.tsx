import DomainLookup from '@/components/DomainLookup';
import { Sun, Moon, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const Index = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

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
              className="flex items-center justify-center h-10 hover:opacity-80 transition-opacity"
            >
              <img src="/logo.png" alt="NIC.BN" className="h-10 w-auto object-contain" />
            </a>
            <a 
              href="https://china.tn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center h-10 hover:opacity-80 transition-opacity"
            >
              <img src="/heise.png" alt="CHINA.TN" className="h-10 w-auto object-contain" />
            </a>
            <a 
              href="https://domain.bf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center h-10 hover:opacity-80 transition-opacity"
            >
              <img src="/domainbf.png" alt="DOMAIN.BF" className="h-10 w-auto object-contain" />
            </a>
            <a 
              href="https://x.rw" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center h-10 hover:opacity-80 transition-opacity"
            >
              <img src="/x.rw.png" alt="X.RW" className="h-10 w-auto object-contain" />
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
