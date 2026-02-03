import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PricingData {
  premium: boolean;
  registerPrice: number;
  renewPrice: number;
  label: string;
  priceError?: boolean;
}

interface PricingInfoProps {
  pricing: PricingData | null;
  loading: boolean;
}

const PricingInfo = ({ pricing, loading }: PricingInfoProps) => {
  if (loading) {
    return (
      <div className="flex items-center gap-4 text-sm py-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  if (!pricing) return null;

  // 价格查询失败或不支持此后缀时显示提示
  if (pricing.priceError) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm py-2">
        <span className="text-muted-foreground">价格: 不支持此后缀</span>
        <span>
          <span className="text-muted-foreground">标签:</span>{' '}
          <span className="font-medium">{pricing.label}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm py-2">
      <span>
        <span className="text-muted-foreground">溢价:</span>{' '}
        <span className="font-medium">{pricing.premium ? '是' : '否'}</span>
      </span>
      <span>
        <span className="text-muted-foreground">注册:</span>{' '}
        <span className="font-medium">¥{pricing.registerPrice}</span>
      </span>
      <span>
        <span className="text-muted-foreground">续费:</span>{' '}
        <span className="font-medium">¥{pricing.renewPrice}</span>
      </span>
      <span>
        <span className="text-muted-foreground">标签:</span>{' '}
        <span className="font-medium">{pricing.label}</span>
      </span>
    </div>
  );
};

export default PricingInfo;
