import React, { useState } from 'react';
import type { ValidationResult } from '../../utils/entryCalculations';
import { useTranslation } from '../../hooks/useTranslation';
import { formatCurrency } from '../../utils/format';
import { useGetDefaultAccounts } from '../../hooks/useGetDefaultAccounts';
import { useSelectedHousingCompany } from '../../hooks/useSelectedHousingCompany';

// Simple Router Link mock
const Link = ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>;
const routes = { defaultAccounts: '#' };

interface BalanceDisplayProps {
  totals: any[];
  balanceInfo: any;
  validation?: ValidationResult;
  isPurchaseInvoice?: boolean;
  isBankTransaction?: boolean;
  bankTransactionAmount?: number;
  isDataLoading?: boolean;
  namespace?: string;
}

export function BalanceDisplay({
  totals,
  balanceInfo,
  validation,
  isPurchaseInvoice = false,
  isBankTransaction = false,
  bankTransactionAmount = 0,
  isDataLoading = false,
  namespace,
}: BalanceDisplayProps) {
  const { t } = useTranslation(namespace);
  const [showErrors, setShowErrors] = useState(false);

  const hasErrors = validation && validation.errors.length > 0;
  const hasWarnings = validation && validation.warnings.length > 0;

  const totalAmount = totals.reduce((sum, total) => {
    const numericString = total.value.replace(/[^\d,-]/g, '').replace(',', '.');
    const value = parseFloat(numericString) || 0;
    return sum + Math.abs(value);
  }, 0);

  const selectedHousingCompany = useSelectedHousingCompany();
  const { data: defaultAccounts } = useGetDefaultAccounts({}, {});
  const { data: bankDefaultAccounts } = useGetDefaultAccounts({}, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
      {isDataLoading && <div>Loading...</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {isPurchaseInvoice ? (
            <>
              <span>
                <strong>Counter Entry:</strong> {formatCurrency(totalAmount)}
              </span>
              <a href="#">Set Default Accounts</a>
            </>
          ) : (
            <>
              {totals.map((total, index) => (
                <span
                  key={index}
                  style={{ backgroundColor: '#F0F0F3', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}
                >
                  <strong>{total.label}:</strong> {total.value}
                </span>
              ))}

              <div
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '4px',
                    backgroundColor: balanceInfo.isBalanced ? '#dcfce7' : '#fecaca'
                }}
              >
                <span>{balanceInfo.isBalanced ? '✓' : '✗'}</span>
                <span style={{ fontWeight: 'bold' }}>
                  {balanceInfo.message}
                </span>
              </div>
            </>
          )}
        </div>

        {validation && (hasErrors || hasWarnings) && (
            <button onClick={() => setShowErrors(!showErrors)}>
                {hasErrors ? 'Errors' : 'Warnings'} ({validation.errors.length + validation.warnings.length}) {showErrors ? '▲' : '▼'}
            </button>
        )}
      </div>

      {validation && showErrors && (hasErrors || hasWarnings) && (
        <div style={{ borderTop: '1px solid #ccc', paddingTop: '8px' }}>
          {validation.errors.map(({ rowIndex, errors }, idx) => (
             <div key={idx} style={{ color: 'red' }}>Row {rowIndex}: {errors.join(', ')}</div>
          ))}
        </div>
      )}
    </div>
  );
}
