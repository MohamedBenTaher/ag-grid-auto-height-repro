export const useGetChartOfAccountsDropdown = (query: any, options: any) => {
  const data = [
    { account_number: '1910', account_name: 'Bank Account', global_account_uuid: 'uuid-1' },
    { account_number: '4000', account_name: 'Maintenance Costs', global_account_uuid: 'uuid-4' },
    { account_number: '3000', account_name: 'Rental Income', global_account_uuid: 'uuid-3' },
  ];
  return { data, isLoading: false };
};
