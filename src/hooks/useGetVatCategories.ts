import { VATCategory } from '../models';

export const useGetVatCategories = () => {
  const data: VATCategory[] = [
    { id: 1, name: 'General 24%', vat_rate: 0.24, vat_status: 'active' },
    { id: 2, name: 'Reduced 14%', vat_rate: 0.14, vat_status: 'active' },
    { id: 3, name: 'Zero 0%', vat_rate: 0, vat_status: 'active' }
  ];
  return { data, isLoading: false };
};
