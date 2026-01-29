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

  const fetchPricing = async (domain: string) => {
    setLoading(true);
    setPricing(null);
    
    try {
      // Extract TLD from domain
      const tld = domain.split('.').pop()?.toLowerCase() || '';
      
      const response = await fetch(`https://api.tian.hu/domain/price?domain=${encodeURIComponent(domain)}`);
      
      if (response.ok) {
        const data = await response.json();
        setPricing({
          premium: data.premium || false,
          registerPrice: data.register_price || data.registerPrice || 0,
          renewPrice: data.renew_price || data.renewPrice || 0,
          label: data.status === 'registered' || data.registered ? '已注册' : '可注册'
        });
      } else {
        // If API fails, set default pricing
        setPricing({
          premium: false,
          registerPrice: 0,
          renewPrice: 0,
          label: '未知'
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
