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
      const response = await fetch(`https://api.tian.hu/pricing/${encodeURIComponent(domain)}`);
      
      if (response.ok) {
        const data = await response.json();
        setPricing({
          premium: data.premium || false,
          registerPrice: data.register || 0,
          renewPrice: data.renew || 0,
          label: isRegistered ? '已注册' : '可注册'
        });
      } else {
        setPricing({
          premium: false,
          registerPrice: 0,
          renewPrice: 0,
          label: isRegistered ? '已注册' : '可注册'
        });
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      setPricing(null);
    } finally {
      setLoading(false);
    }
  };

  const clearPricing = () => {
    setPricing(null);
  };

  return { pricing, loading, fetchPricing, clearPricing };
};
