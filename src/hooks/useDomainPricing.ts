import { useState } from 'react';

interface PricingData {
  premium: boolean;
  registerPrice: number;
  renewPrice: number;
  label: string;
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
        
        setPricing({
          premium: data.premium === true || data.premium === 'true',
          registerPrice: data.register || data.register_price || data.registerPrice || data.price || 0,
          renewPrice: data.renew || data.renew_price || data.renewPrice || 0,
          label: isRegistered ? '已注册' : '可注册'
        });
      } else {
        console.log('Pricing API failed with status:', response.status);
        setPricing({
          premium: false,
          registerPrice: 0,
          renewPrice: 0,
          label: isRegistered ? '已注册' : '可注册'
        });
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      setPricing({
        premium: false,
        registerPrice: 0,
        renewPrice: 0,
        label: isRegistered ? '已注册' : '可注册'
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
