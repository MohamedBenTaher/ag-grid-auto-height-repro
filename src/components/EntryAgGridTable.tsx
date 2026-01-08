import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CellEditRequestEvent,
  ColDef,
  GridApi,
  SelectionChangedEvent,
} from 'ag-grid-community';
import { AgGridTable } from './AgGridTable';
import { Button } from './ui/button';
import {
  calculateEntryTotals,
  createEmptyEntryRow,
  hasValidEntries,
  updateRowWithCalculations,
  validateDebitCreditBalance,
  validateEntryRows,
} from '../utils/entryCalculations';
import type {
  EntryColumnConfig,
  EntryTableRow,
} from './entry-table/types';
import { BalanceDisplay } from './entry-table/BalanceDisplay';
import { useEntryColumns } from './entry-table/useEntryColumns';
import { useGetVatCategories } from '../hooks/useGetVatCategories';
import type { VATCategory } from '../models';
import { useTranslation } from '../hooks/useTranslation';
import type { EntryTableRef } from './entry-table/types';

// Mock toast
const toast = {
  error: (msg: string) => console.error(msg),
  info: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(msg),
};

interface EntryAgGridTableProps {
  onSubmit?: (data: EntryTableRow[]) => void | Promise<void>;
  showSubmitErrors?: boolean;
  initialData?: EntryTableRow[];
  dataMapper?: <T>(data: EntryTableRow[]) => T;
  isPurchaseInvoice?: boolean;
  isBankTransaction?: boolean;
  bankTransactionAmount?: number;
  readOnly?: boolean;
  namespace?: string;
  popupParent?: HTMLElement | null;
}

type EntryValidationMap = Map<string | number, string[]>;

export const EntryAgGridTable = forwardRef<EntryTableRef, EntryAgGridTableProps>(
  (
    {
      onSubmit,
      showSubmitErrors = false,
      initialData,
      dataMapper,
      isPurchaseInvoice = false,
      isBankTransaction = false,
      bankTransactionAmount = 0,
      readOnly = false,
      namespace,
      popupParent,
    },
    ref
  ) => {
    const { t } = useTranslation('shared');
    const gridApiRef = useRef<GridApi | null>(null);

    const [data, setData] = useState<EntryTableRow[]>(() => {
      if (initialData && initialData.length > 0) return initialData;
      return [createEmptyEntryRow(), createEmptyEntryRow()];
    });
    const [showValidation, setShowValidation] = useState(showSubmitErrors);
    const [selectedRowIds, setSelectedRowIds] = useState<Array<string | number>>([]);

    const { data: vatCategoriesResponse, isLoading: isVatLoading } = useGetVatCategories();

    const vatCategories = useMemo<VATCategory[]>(() => {
      if (!vatCategoriesResponse) return [];
      // Simplified check for now
      return vatCategoriesResponse as VATCategory[];
    }, [vatCategoriesResponse]);

    const entryColumns = useEntryColumns(
      vatCategories,
      isVatLoading,
      namespace
    ) as EntryColumnConfig[];

    const dataLoading = isVatLoading || entryColumns.some(column => column.isLoading);
    const effectiveReadOnly = readOnly || dataLoading;

    useEffect(() => {
      setShowValidation(showSubmitErrors);
    }, [showSubmitErrors]);

    useEffect(() => {
      if (!initialData) return;
      const nextData =
        initialData.length > 0 ? initialData : [createEmptyEntryRow(), createEmptyEntryRow()];
      setData(prev => nextData); // simplified for reproduction
      setSelectedRowIds([]);
    }, [initialData]);

    useEffect(() => {
      if (isVatLoading || vatCategories.length === 0) return;
      setData(prev =>
        prev.map(row => {
          if (row.vat_category_id && (!row.vat_rate || !row.vat_amount)) {
            const updated = updateRowWithCalculations([row], row.id, {}, vatCategories);
            return updated[0];
          }
          return row;
        })
      );
    }, [isVatLoading, vatCategories]);

    const totals = useMemo(() => calculateEntryTotals(data), [data]);
    const balanceInfo = useMemo(() => validateDebitCreditBalance(data), [data]);
    const validation = useMemo(() => {
      if (!showValidation) return undefined;
      return validateEntryRows(data);
    }, [data, showValidation]);

    const validationErrorsByRow: EntryValidationMap = useMemo(() => {
      const map: EntryValidationMap = new Map();
      if (!validation || !showValidation || !Array.isArray(validation.errors)) return map;
      validation.errors.forEach(error => {
        if (error.rowIndex <= 0) return;
        const row = data[error.rowIndex - 1];
        if (!row) return;
        const existing = map.get(row.id) || [];
        map.set(row.id, [...existing, ...error.errors]);
      });
      return map;
    }, [validation, showValidation, data]);

    const handleSelectionChanged = useCallback((event: SelectionChangedEvent) => {
      const newSelection: Array<string | number> = [];
      event.api.getSelectedNodes().forEach(node => {
        if (node.data?.id) {
          newSelection.push(node.data.id);
        }
      });
      setSelectedRowIds(newSelection);
    }, []);

    const parseValue = useCallback(
      (field: string, value: unknown, oldValue?: unknown, inputType?: string) => {
        if (inputType === 'value-select') {
          if (value === '' || value === null || value === undefined) return undefined;
          return String(value);
        }
        switch (field) {
          case 'amount_eur_excl_vat':
          case 'vat_amount':
          case 'amount_eur_incl_vat': {
            if (value === '' || value === null || value === undefined) return oldValue ?? 0;
            const parsed = Number(value);
            if (isNaN(parsed)) return oldValue !== undefined ? oldValue : 0;
            return parsed;
          }
           case 'vat_rounding_correction': {
            if (value === '' || value === null || value === undefined) return oldValue ?? 0;
            const parsed = Number(value);
            return isNaN(parsed) ? (oldValue !== undefined ? oldValue : 0) : Math.max(-0.1, Math.min(parsed, 0.1));
          }
          case 'vat_allocation': {
            if (value === '' || value === null || value === undefined) return oldValue ?? 100;
            const parsed = Number(value);
            return isNaN(parsed) ? (oldValue !== undefined ? oldValue : 100) : Math.max(0, Math.min(parsed, 100));
          }
          default:
            if (value === null || value === undefined) return '';
            return typeof value === 'string' || typeof value === 'number' ? value : String(value);
        }
      },
      [t]
    );

    const handleCellEditRequest = useCallback(
      (event: CellEditRequestEvent<EntryTableRow>) => {
        const field = event.colDef.field;
        if (!field) return;
        const rowId = event.data?.id;
        if (!rowId) return;

        const column = entryColumns.find(col => col.key === field);
        const parsedValue = parseValue(field, event.newValue, event.oldValue, column?.inputType);

        setData(prevData => {
          const updates: Partial<EntryTableRow> = {
            [field]: parsedValue,
          } as Partial<EntryTableRow>;

          if (column?.onChange) {
            const additional = column.onChange(event.data, parsedValue, column.options);
            if (additional && typeof additional === 'object') {
              Object.assign(updates, additional);
            }
          }
          return updateRowWithCalculations(prevData, rowId, updates, vatCategories);
        });
      },
      [entryColumns, parseValue, vatCategories]
    );

    const columnDefs = useMemo<ColDef<EntryTableRow>[]>(() => {
      const columns = entryColumns.map(column => {
        const alignmentClass = column.alignment === 'right' ? 'ag-grid-table__numeric' : undefined;
        const baseDef: ColDef<EntryTableRow> = {
          field: column.key,
          headerName: column.header,
          editable: !effectiveReadOnly && column.inputType !== 'readonly',
          flex: column.widthPercents ? Math.max(column.widthPercents / 10, 1) : 1,
          tooltipValueGetter: column.tooltip
            ? params => column.tooltip ?? String(params.value ?? '')
            : undefined,
          cellClass: params => {
            const classes: string[] = [];
            if (alignmentClass) classes.push(alignmentClass);
            if (column.inputType === 'readonly') classes.push('ag-grid-table__readonly-cell');
            if (showValidation && params.data?.id && validationErrorsByRow.has(params.data.id) && column.inputType !== 'readonly') {
              classes.push('ag-grid-table__entry-error');
            }
            return classes.join(' ');
          },
        };

        if (typeof column.widthPixels !== 'undefined') {
          baseDef.minWidth = column.widthPixels;
        }
        if (column.formatDisplayValue) {
          baseDef.valueFormatter = params => column.formatDisplayValue!(params.value);
        }
        if (column.inputType === 'number') {
          baseDef.cellEditor = 'agTextCellEditor';
          baseDef.valueParser = params => {
             const value = params.newValue;
             if (value === '' || value === null || value === undefined) return 0;
             const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
             const parsed = parseFloat(cleaned);
             if (isNaN(parsed)) return params.oldValue ?? 0;
             let result = parsed;
             if (column.min !== undefined) result = Math.max(column.min, result);
             if (column.max !== undefined) result = Math.min(column.max, result);
             return result;
          };
          if (!column.formatDisplayValue) {
            baseDef.valueFormatter = params => {
              const val = params.value;
              if (val === null || val === undefined || isNaN(val)) return '';
              return Number(val).toFixed(2).replace('.', ',');
            };
          }
        }
        if (column.inputType === 'value-select') {
          baseDef.cellEditor = 'agRichSelectCellEditor';
          baseDef.cellEditorPopup = true;
          const optionsMap = new Map(column.options?.map(opt => [opt.value, opt.label]) ?? []);
          baseDef.cellEditorParams = {
            values: column.options?.map(option => option.value) ?? [],
            formatValue: (value: string) => optionsMap.get(String(value)) || value,
            searchType: 'matchAny',
            allowTyping: true,
            filterList: true,
            highlightMatch: true,
            valueListMaxHeight: 350,
            cellHeight: 44,
          };
          if (!baseDef.valueFormatter) {
             baseDef.valueFormatter = params => optionsMap.get(String(params.value)) || params.value || '';
          }
        }
        return baseDef;
      });
      return columns;
    }, [entryColumns, effectiveReadOnly, showValidation, validationErrorsByRow]);

    const handleAddRow = useCallback(() => {
      setData(prev => [...prev, createEmptyEntryRow()]);
    }, []);

    const handleDuplicateRow = useCallback(() => {
        if (selectedRowIds.length === 0) return;
        setData(prev => {
            const newRows = [...prev];
            selectedRowIds.forEach(rowId => {
              const row = prev.find(r => r.id === rowId);
              if (!row) return;
              newRows.push({ ...row, id: crypto.randomUUID() });
            });
            return newRows;
        });
    }, [selectedRowIds]);

    const handleDeleteRows = useCallback(() => {
        if (selectedRowIds.length === 0) return;
        setData(prev => {
            const remaining = prev.filter(row => !selectedRowIds.includes(row.id));
            if (remaining.length === 0) return [createEmptyEntryRow()];
            return remaining;
        });
        setSelectedRowIds([]);
    }, [selectedRowIds]);

    useImperativeHandle(ref, () => ({
      submit: async () => {},
      getData: () => data,
      isValid: () => true, // simplified
      validate: () => true, // simplified
      setData: newData => {
          const normalized = Array.isArray(newData) && newData.length > 0
              ? newData
              : [createEmptyEntryRow(), createEmptyEntryRow()];
          setData(normalized);
          setSelectedRowIds([]);
      },
    }), [data]);

    return (
      <div className="space-y-3">
        <div className="ag-grid-entry-wrapper">
          <AgGridTable<EntryTableRow>
            data={data}
            columnDefs={columnDefs}
            variant="compact"
            loading={dataLoading}
            editable={true}
            getRowId={params => String(params.data.id)}
            rowSelection={{ mode: 'multiRow' }}
            onSelectionChanged={handleSelectionChanged}
            onCellEditRequest={handleCellEditRequest}
            readOnlyEdit={true}
            suppressMultiRangeSelection={true}
            stopEditingWhenCellsLoseFocus={true}
            singleClickEdit={true}
            suppressRowClickSelection={true}
            onGridReady={event => {
                gridApiRef.current = event.api;
                event.api.sizeColumnsToFit();
            }}
            popupParent={popupParent}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
             <Button onClick={handleAddRow}>+ Add Row</Button>
             <Button onClick={handleDuplicateRow}>Duplicate</Button>
             <Button onClick={handleDeleteRows} style={{ backgroundColor: 'red' }}>Delete</Button>
        </div>
        <BalanceDisplay
          totals={totals}
          balanceInfo={balanceInfo}
          validation={validation}
          isPurchaseInvoice={isPurchaseInvoice}
          isBankTransaction={isBankTransaction}
          bankTransactionAmount={bankTransactionAmount}
          isDataLoading={dataLoading}
          namespace={namespace}
        />
      </div>
    );
  }
);

EntryAgGridTable.displayName = 'EntryAgGridTable';
