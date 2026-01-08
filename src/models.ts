export interface VATCategory {
  id: number;
  name: string;
  vat_rate: number;
  vat_status: string;
}

export interface DefaultAccount {
    account_number: string;
    account_name: string;
}

export enum DefaultAccountCategory {
    AccountPayable = 'account_payable',
    UnallocatedPayable = 'unallocated_payable',
    UnallocatedReceivable = 'unallocated_receivable'
}
