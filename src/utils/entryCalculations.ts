import type { EntryTableRow } from '../components/entry-table/types';
import type { VATCategory } from '../models';
import { formatCurrency } from './format';

export const calculateVatAmounts = (
  row: EntryTableRow,
  vatCategories: VATCategory[]
): EntryTableRow => {
  if (!vatCategories || vatCategories.length === 0) {
    return {
      ...row,
      vat_rate: 0,
      vat_amount: 0,
      amount_eur_incl_vat: row.amount_eur_excl_vat + (row.vat_rounding_correction || 0),
    };
  }

  if (!row.vat_category_id) {
    return {
      ...row,
      vat_rate: 0,
      vat_amount: 0,
      amount_eur_incl_vat: row.amount_eur_excl_vat + (row.vat_rounding_correction || 0),
    };
  }

  let vatCategoryId = row.vat_category_id;
  if (typeof vatCategoryId === 'string') {
     vatCategoryId = parseInt(vatCategoryId, 10);
  }

  const vatCategory = vatCategories.find(
    vat => vat.id?.toString() === vatCategoryId?.toString()
  );

  if (!vatCategory) {
    return {
      ...row,
      vat_rate: 0,
      vat_amount: 0,
      amount_eur_incl_vat: row.amount_eur_excl_vat,
      vat_category_id: undefined,
    };
  }

  const vatRate = vatCategory.vat_rate * 100;

  const vatAmountRaw = row.amount_eur_excl_vat * vatCategory.vat_rate;
  const vatAmount = Math.round(vatAmountRaw * 100) / 100;

  const vatRoundingCorrection = Math.max(-0.1, Math.min(row.vat_rounding_correction || 0, 0.1));
  const total = row.amount_eur_excl_vat + vatAmount + vatRoundingCorrection;

  const result = {
    ...row,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    amount_eur_incl_vat: total,
    vat_category_id: vatCategory.id,
  };
  return result;
};

export const updateRowWithCalculations = (
  data: EntryTableRow[],
  rowId: string | number,
  updates: Partial<EntryTableRow>,
  vatCategories?: VATCategory[]
): EntryTableRow[] => {
  const newData = data.map(row => {
    if (row.id !== rowId) {
      return row;
    }

    let updatedRow = { ...row, ...updates };

    if (!vatCategories?.length) {
      return updatedRow;
    }

    if (updatedRow.vat_category_id) {
      if (typeof updatedRow.vat_category_id === 'string') {
        updatedRow = { ...updatedRow, vat_category_id: parseInt(updatedRow.vat_category_id, 10) };
      }

      const vatCategory = vatCategories.find(
        vat => vat.id?.toString() === updatedRow.vat_category_id?.toString()
      );

      if (vatCategory) {
        const vatRate = vatCategory.vat_rate;
        const amountExclVat = updatedRow.amount_eur_excl_vat || 0;
        const vatAmountRaw = amountExclVat * vatRate;
        const vatAmount = Math.round(vatAmountRaw * 100) / 100;

        const vatRoundingCorrection = Math.max(
          -0.1,
          Math.min(updatedRow.vat_rounding_correction || 0, 0.1)
        );

        const calculatedRow = {
          ...updatedRow,
          vat_rate: vatRate * 100,
          vat_amount: vatAmount,
          amount_eur_incl_vat: amountExclVat + vatAmount + vatRoundingCorrection,
          vat_category_id: vatCategory.id,
        };

        return calculatedRow;
      }
    }

    const clearedRow = {
      ...updatedRow,
      vat_rate: 0,
      vat_amount: 0,
      amount_eur_incl_vat:
        (updatedRow.amount_eur_excl_vat || 0) + (updatedRow.vat_rounding_correction || 0),
    };

    return clearedRow;
  });

  return newData;
};

export const createEmptyEntryRow = (): EntryTableRow => ({
  id: crypto.randomUUID(),
  account_number: '',
  amount_eur_excl_vat: 0,
  vat_category_id: undefined,
  vat_rate: 0,
  vat_amount: 0,
  amount_eur_incl_vat: 0,
  vat_allocation: 100,
  vat_rounding_correction: 0,
  description: '',
});

export const calculateEntryTotals = (data: EntryTableRow[]) => {
  const totalDebit = data.reduce((sum, row) => {
    const value = Number(row.amount_eur_incl_vat) || 0;
    return sum + (value > 0 ? value : 0);
  }, 0);

  const totalCredit = data.reduce((sum, row) => {
    const value = Number(row.amount_eur_incl_vat) || 0;
    return sum + (value < 0 ? Math.abs(value) : 0);
  }, 0);

  return [
    {
      label: 'Debet',
      value: formatCurrency(totalDebit),
    },
    {
      label: 'Kredit',
      value: formatCurrency(totalCredit),
    },
  ];
};

export const validateDebitCreditBalance = (data: EntryTableRow[]) => {
  const totalDebit = data.reduce((sum, row) => {
    const value = Number(row.amount_eur_incl_vat) || 0;
    return sum + (value > 0 ? value : 0);
  }, 0);

  const totalCredit = data.reduce((sum, row) => {
    const value = Number(row.amount_eur_incl_vat) || 0;
    return sum + (value < 0 ? Math.abs(value) : 0);
  }, 0);

  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01;

  return {
    isBalanced,
    difference: formatCurrency(difference),
    message: isBalanced ? 'Täsmää' : `Ei täsmää (${formatCurrency(difference)})`,
    totalDebit,
    totalCredit,
  };
};

export interface RowValidationError {
  rowIndex: number;
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: RowValidationError[];
  warnings: RowValidationError[];
  hasEmptyRows: boolean;
  isBalanced: boolean;
}

const validateRow = (row: EntryTableRow, _index: number): string[] => {
  const errors: string[] = [];
  const isEmpty =
    !row.account_number &&
    row.amount_eur_excl_vat === 0 &&
    !row.vat_category_id &&
    !row.description;
  if (isEmpty) return [];

  if (!row.account_number) {
    errors.push('Tilinumero vaaditaan');
  }
  if (row. vat_category_id === undefined) {
      if (row.amount_eur_excl_vat !== 0) {
        errors.push('ALV-kategoria vaaditaan');
      }
  }

  return errors;
};

export const validateEntryRows = (data: EntryTableRow[]): ValidationResult => {
  const errors: RowValidationError[] = [];
  const warnings: RowValidationError[] = [];
  let emptyRowCount = 0;

  data.forEach((row, index) => {
    const isEmpty =
      !row.account_number &&
      row.amount_eur_excl_vat === 0 &&
      !row.vat_category_id &&
      !row.description;
    if (isEmpty) {
      emptyRowCount++;
      return;
    }

    const rowErrors = validateRow(row, index);
    if (rowErrors.length > 0) {
      errors.push({
        rowIndex: index + 1,
        errors: rowErrors,
      });
    }
  });

  const balanceInfo = validateDebitCreditBalance(data);
  const hasNonEmptyRows = data.length - emptyRowCount > 0;
  if (hasNonEmptyRows && !balanceInfo.isBalanced) {
    errors.push({
      rowIndex: 0,
      errors: [balanceInfo.message],
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    hasEmptyRows: emptyRowCount > 0,
    isBalanced: balanceInfo.isBalanced,
  };
};

export const hasValidEntries = (data: EntryTableRow[]): boolean => {
  return data.some(
    row =>
      row.account_number &&
      (row.amount_eur_excl_vat !== 0 || !!row.description || !!row.vat_category_id)
  );
};
