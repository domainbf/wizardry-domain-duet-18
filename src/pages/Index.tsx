import DomainLookup from '@/components/DomainLookup';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe2, Zap, Shield, Database } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Globe2 className="h-12 w-12 text-primary animate-pulse-glow" />
              <div className="absolute inset-0 h-12 w-12 bg-primary/20 rounded-full blur-xl"></div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold gradient-text">
              WHOIS.NIC.BN
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            愚蠢的WHOIS查询程序
          </p>
          
          {/* Feature badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <Badge variant="outline" className="px-4 py-2 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              快速响应
            </Badge>
            <Badge variant="outline" className="px-4 py-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              隐私安全
            </Badge>
            <Badge variant="outline" className="px-4 py-2 flex items-center gap-2">
              <Database className="h-4 w-4" />
              不存数据
            </Badge>
          </div>
        </div>

        {/* Main Lookup Component */}
        <DomainLookup />

        {/* Footer Info */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">极速响应</h3>
              <p className="text-sm text-muted-foreground">
                提供免费的whois查询服务，但不确保数据准确性
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">隐私安全</h3>
              <p className="text-sm text-muted-foreground">
                专业级查询服务，保护您的隐私安全
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <Database className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">全面信息</h3>
              <p className="text-sm text-muted-foreground">
                完整的域名信息，包括注册、DNS、安全状态
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
