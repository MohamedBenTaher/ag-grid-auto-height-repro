export interface BaseEntryRow {
  id: string | number;
  [key: string]: unknown;
}

export interface EntryTableRow {
  id: string | number;
  account_number: string;
  account_name?: string;
  amount_eur_excl_vat: number;
  vat_category_id?: number;
  vat_rate?: number;
  vat_amount?: number;
  amount_eur_incl_vat?: number;
  vat_allocation: number;
  vat_rounding_correction?: number;
  description: string;
  children?: EntryTableRow[];
  [key: string]: unknown;
}

export interface SelectOption {
  value: string;
  label: string;
  meta?: Record<string, unknown>;
}

export type InputType = 'text' | 'number' | 'readonly' | 'value-select' | 'checkbox';

export interface EntryColumnConfig {
  key: string;
  header: string;
  inputType: InputType;
  widthPercents?: number;
  widthPixels?: number;
  options?: { label: string; value: string; meta?: Record<string, unknown> }[];
  isLoading?: boolean;
  alignment?: 'left' | 'center' | 'right';
  formatDisplayValue?: (value: unknown) => string;
  onChange?: (
    row: unknown,
    value: unknown,
    options?: { label: string; value: string; meta?: Record<string, unknown> }[]
  ) => void | boolean | Partial<Record<string, unknown>>;
  step?: number;
  min?: number;
  max?: number;
  tooltip?: string;
}

export interface EntryTableRef {
  getData: () => EntryTableRow[];
  validate: () => any;
}
