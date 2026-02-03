import { useState } from 'react';

interface PricingData {
  premium: boolean;
  registerPrice: number;
  renewPrice: number;
  label: string;
  priceError?: boolean; // 标记价格查询是否失败
}

export const useDomainPricing = () => {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPricing = async (domain: string, isRegistered: boolean = true) => {
    setLoading(true);
    setPricing(null);
    
    try {
      // Try different API endpoint formats
      const response = await fetch(`https://api.tian.hu/pricing/${encodeURIComponent(domain)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Pricing API response:', responseData);
        
        // API returns nested data: { code: 200, data: { premium, register, renew, ... } }
        const data = responseData.data || responseData;
        
        // 检查价格是否有效（0或undefined都视为无效）
        const registerPrice = data.register || data.register_price || data.registerPrice || data.price || 0;
        const renewPrice = data.renew || data.renew_price || data.renewPrice || 0;
        const hasValidPrice = registerPrice > 0 || renewPrice > 0;
        
        setPricing({
          premium: data.premium === true || data.premium === 'true',
          registerPrice,
          renewPrice,
          label: isRegistered ? '已注册' : '可注册',
          priceError: !hasValidPrice // 价格为0时标记为错误
        });
      } else {
        console.log('Pricing API failed with status:', response.status);
        // API返回非200状态码，标记为价格查询失败
        setPricing({
          premium: false,
          registerPrice: 0,
          renewPrice: 0,
          label: isRegistered ? '已注册' : '可注册',
          priceError: true
        });
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      // 网络错误等，标记为价格查询失败
      setPricing({
        premium: false,
        registerPrice: 0,
        renewPrice: 0,
        label: isRegistered ? '已注册' : '可注册',
        priceError: true
      });
    } finally {
      setLoading(false);
    }
  };

  const clearPricing = () => {
    setPricing(null);
  };

  return { pricing, loading, fetchPricing, clearPricing };
};
