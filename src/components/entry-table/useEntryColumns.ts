import { useMemo, useCallback } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useGetChartOfAccountsDropdown } from '../../hooks/useGetChartOfAccountsDropdown';
import { useSelectedHousingCompany } from '../../hooks/useSelectedHousingCompany';

export const useEntryColumns = (
  vatCategories: any[] = [],
  isVatLoading: boolean = false,
  namespace?: string
) => {
  // Always active
  const selectedHousingCompany = useSelectedHousingCompany();
  const { data: chartOfAccounts = [], isLoading: isAccountsLoading } = useGetChartOfAccountsDropdown({},{});
  const { t } = useTranslation();

  const accountOptions = useMemo(
    () =>
      (Array.isArray(chartOfAccounts) ? chartOfAccounts : []).map((account: any) => ({
        value: account.account_number || '',
        label: `${account.account_number} - ${account.account_name}`,
        meta: {
          account_name: account.account_name,
          global_account_uuid: account.global_account_uuid,
        },
      })),
    [chartOfAccounts]
  );

  return useMemo(() => {
    return [
      {
        key: 'account_number',
        header: 'Account',
        inputType: 'value-select',
        widthPercents: 20,
        alignment: 'left',
        options: accountOptions,
        isLoading: isAccountsLoading,
        formatDisplayValue: (value: any) => {
          const stringValue = String(value || '');
          const option = accountOptions.find(opt => opt.value === stringValue);
          return option ? option.label : stringValue || '-';
        },
      },
      {
        key: 'amount_eur_excl_vat',
        header: 'Amount (excl. VAT)',
        inputType: 'number',
        widthPercents: 15,
        alignment: 'right',
      },
       {
        key: 'vat_category_id',
        header: 'VAT Category',
        inputType: 'value-select',
        widthPercents: 15,
        options: vatCategories.map(v => ({ value: String(v.id), label: v.name })),
        isLoading: isVatLoading,
      },
      {
        key: 'vat_amount',
        header: 'VAT Amount',
        inputType: 'readonly',
        widthPercents: 10,
        alignment: 'right',
      },
      {
        key: 'amount_eur_incl_vat',
        header: 'Total',
        inputType: 'readonly',
        widthPercents: 15,
        alignment: 'right',
      },
      {
          key: 'description',
          header: 'Description',
          inputType: 'text',
          widthPercents: 25,
      }
    ];
  }, [accountOptions, isAccountsLoading, vatCategories, isVatLoading]);
};
