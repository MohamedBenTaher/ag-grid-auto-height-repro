import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-enterprise';

import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  SortChangedEvent,
  IServerSideDatasource,
  IServerSideGetRowsParams,
  FilterModel,
  AdvancedFilterModel,
  JoinAdvancedFilterModel,
  ColumnState,
} from 'ag-grid-community';
import './AgGridTable.css';
import { createAgGridTheme, getVariantDimensions, type AgGridVariant } from '../utils/agGridTheme';
import { defaultPageSizes, defaultPageSize } from '../utils/constants';

export interface ServerSideParams {
  startRow: number;
  endRow: number;
  sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>;
  filterModel: FilterModel | AdvancedFilterModel | JoinAdvancedFilterModel | null;
  groupKeys?: string[];
}

export interface ServerSideResponse<RowType> {
  rows: RowType[];
  lastRow?: number;
}

export interface AgGridTableProps<RowType = object> {
  serverSideMode?: boolean;
  fetchServerSideData?: (params: ServerSideParams) => Promise<ServerSideResponse<RowType>>;
  cacheBlockSize?: number;
  maxBlocksInCache?: number;
  data?: RowType[];
  pagination?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[] | boolean;
  variant?: AgGridVariant;
  domLayout?: 'autoHeight' | 'normal';
  loading?: boolean;
  columnDefs: ColDef[];
  autoGroupColumnDef?: ColDef;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy?: string, sortOrder?: 'asc' | 'desc') => void;
  getDataPath?: (row: RowType) => string[];
  getRowId?: (params: { data: RowType }) => string;
  rowClassRules?: Record<
    string,
    (params: import('ag-grid-community').RowClassParams<RowType>) => boolean
  >;
  onGridReady?: (event: GridReadyEvent) => void;
  overlayLoadingTemplate?: string;
  overlayNoRowsTemplate?: string;
  [key: string]: unknown;
}

export const AgGridTable = <RowType extends object = object>({
  serverSideMode = false,
  fetchServerSideData,
  cacheBlockSize = 100,
  maxBlocksInCache = 10,
  data = [],
  pagination = false,
  paginationPageSize = defaultPageSize,
  paginationPageSizeSelector = defaultPageSizes,
  variant = 'normal',
  domLayout: domLayoutProp = 'autoHeight',
  loading = false,
  columnDefs,
  autoGroupColumnDef,
  sortBy,
  sortOrder,
  onSortChange,
  getDataPath,
  getRowId,
  rowClassRules,
  editable = false,
  onGridReady,
  ...otherProps
}: AgGridTableProps<RowType>) => {
  const gridApiRef = useRef<GridApi | null>(null);
  const gridReadyRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<RowType[]>(data);

  const refreshLayout = useCallback((delay = 0, options: { resetRowHeights?: boolean } = {}) => {
    const { resetRowHeights = false } = options;

    const run = () => {
      if (!gridApiRef.current) return;
      gridApiRef.current.sizeColumnsToFit();
      gridApiRef.current.redrawRows();
      if (resetRowHeights && typeof gridApiRef.current.resetRowHeights === 'function') {
        gridApiRef.current.resetRowHeights();
      }
    };

    if (delay <= 0) {
      run();
    } else {
      setTimeout(run, delay);
    }
  }, []);

  const theme = useMemo(() => createAgGridTheme(variant), [variant]);
  const dimensions = useMemo(() => getVariantDimensions(variant), [variant]);

  const serverSideDatasource: IServerSideDatasource = useMemo(
    () => ({
      getRows: async (params: IServerSideGetRowsParams) => {
        if (!fetchServerSideData) {
          params.fail();
          return;
        }

        try {
          const serverParams: ServerSideParams = {
            startRow: params.request.startRow || 0,
            endRow: params.request.endRow || 100,
            sortModel: params.request.sortModel,
            filterModel: params.request.filterModel,
            groupKeys: params.request.groupKeys,
          };

          const response = await fetchServerSideData(serverParams);

          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
          });
        } catch (error) {
          console.error('Server-side data fetch failed:', error);
          params.fail();
        }
      },
    }),
    [fetchServerSideData]
  );

  const handleSortChanged = useCallback(
    (event: SortChangedEvent) => {
      if (!onSortChange) return;
      const api = event.api;
      const columnState = typeof api.getColumnState === 'function' ? api.getColumnState() : [];
      const sortedColumns = columnState.filter(
        (col: ColumnState) => col.sort !== undefined && col.sort !== null
      );
      if (!sortedColumns || sortedColumns.length === 0) {
        onSortChange(undefined, undefined);
        return;
      }
      const { colId, sort } = sortedColumns[0];
      if (colId === sortBy && sort === sortOrder) return;
      onSortChange(colId, sort ?? undefined);
    },
    [onSortChange, sortBy, sortOrder]
  );

  useEffect(() => {
    if (!serverSideMode || !gridApiRef.current || !fetchServerSideData) return;
    const api = gridApiRef.current;
    if (
      api &&
      typeof (api as GridApi & { setServerSideDatasource?: (ds: IServerSideDatasource) => void })
        .setServerSideDatasource === 'function'
    ) {
      (
        api as GridApi & { setServerSideDatasource: (ds: IServerSideDatasource) => void }
      ).setServerSideDatasource(serverSideDatasource);
    }
  }, [serverSideMode, fetchServerSideData, serverSideDatasource]);

  useEffect(() => {
    if (serverSideMode) return;
    const api = gridApiRef.current;
    if (!api || typeof api.applyColumnState !== 'function') return;
    const model = sortBy && sortOrder ? [{ colId: sortBy, sort: sortOrder }] : [];
    api.applyColumnState({ state: model, applyOrder: true });
  }, [sortBy, sortOrder, serverSideMode]);

  useEffect(() => {
    if (serverSideMode) return;
    dataRef.current = data;
    if (!gridReadyRef.current || !gridApiRef.current) return;
    const api = gridApiRef.current;
    if (typeof api.setGridOption === 'function') {
      api.setGridOption('rowData', data);
      requestAnimationFrame(() => {
        refreshLayout(0, { resetRowHeights: true });
        refreshLayout(50, { resetRowHeights: true });
      });
    }
  }, [data, refreshLayout, serverSideMode]);

  useEffect(() => {
    if (!gridApiRef.current) return;
    if (loading) {
      gridApiRef.current.showLoadingOverlay();
      return;
    }
    if (!serverSideMode && data.length === 0) {
      gridApiRef.current.showNoRowsOverlay();
    } else {
      gridApiRef.current.hideOverlay();
    }
  }, [loading, data, serverSideMode]);

  useEffect(() => {
    if (!gridApiRef.current || !containerRef.current) return;
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (gridApiRef.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (!serverSideMode && dataRef.current && dataRef.current.length > 0) {
              if (typeof gridApiRef.current.setGridOption === 'function') {
                gridApiRef.current.setGridOption('rowData', dataRef.current);
              }
            }
            refreshLayout(0, { resetRowHeights: true });
          }
        }
      }, 100);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    const intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && gridApiRef.current) {
            if (!serverSideMode && dataRef.current && dataRef.current.length > 0) {
              if (typeof gridApiRef.current.setGridOption === 'function') {
                gridApiRef.current.setGridOption('rowData', dataRef.current);
              }
            }
            refreshLayout(50, { resetRowHeights: true });
          }
        });
      },
      { threshold: 0.1 }
    );
    intersectionObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [refreshLayout, serverSideMode]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && gridApiRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (!serverSideMode && dataRef.current && dataRef.current.length > 0) {
            if (typeof gridApiRef.current.setGridOption === 'function') {
              gridApiRef.current.setGridOption('rowData', dataRef.current);
            }
          }
          setTimeout(() => {
            refreshLayout(0, { resetRowHeights: true });
          }, 100);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshLayout, serverSideMode]);

  const gridOptions = useMemo(() => {
    const baseOptions = {
      columnDefs,
      autoGroupColumnDef,
      defaultColDef: { flex: 1, resizable: true, sortable: true },
      animateRows: false,
      headerHeight: dimensions.headerHeight,
      rowHeight: dimensions.rowHeight,
      suppressCellFocus: !editable,
      suppressDragLeaveHidesColumns: true,
      suppressMovableColumns: true,
      rowClassRules,
      getRowId,
      overlayLoadingTemplate: otherProps.overlayLoadingTemplate,
      overlayNoRowsTemplate: otherProps.overlayNoRowsTemplate,
      ...otherProps,
    };

    if (typeof getDataPath === 'function') {
      (baseOptions as any).treeData = true;
      (baseOptions as any).getDataPath = getDataPath;
    }

    if (serverSideMode) {
      return {
        ...baseOptions,
        rowModelType: 'serverSide' as const,
        serverSideInitialRowCount: 1,
        cacheBlockSize,
        maxBlocksInCache,
        suppressPaginationPanel: false,
        pagination: true,
        paginationPageSize: cacheBlockSize,
      };
    }

    return {
      ...baseOptions,
      pagination,
      paginationPageSize,
      paginationPageSizeSelector,
      suppressPaginationPanel: !pagination,
      domLayout: domLayoutProp,
      groupDefaultExpanded: -1,
    };
  }, [
    serverSideMode,
    columnDefs,
    autoGroupColumnDef,
    rowClassRules,
    getDataPath,
    getRowId,
    cacheBlockSize,
    maxBlocksInCache,
    pagination,
    domLayoutProp,
    paginationPageSize,
    paginationPageSizeSelector,
    otherProps,
    editable,
    dimensions,
  ]);

  const handleFirstDataRendered = useCallback(() => {
    if (gridApiRef.current) {
      refreshLayout(0, { resetRowHeights: true });
      refreshLayout(100, { resetRowHeights: true });
    }
  }, [refreshLayout]);

  const containerClassName = `ag-theme-alpine ag-grid-table ag-grid-table--${variant}${domLayoutProp === 'normal' ? ' ag-grid-table--fixed-height' : ''}`;
  const containerStyle: React.CSSProperties =
    domLayoutProp === 'normal'
      ? { width: '100%', height: '500px' }
      : { width: '100%', minHeight: variant === 'compact' ? '200px' : '400px' };

  return (
    <div ref={containerRef} className={containerClassName} style={containerStyle}>
      <AgGridReact<RowType>
        {...gridOptions}
        theme={theme}
        popupParent={
          otherProps.popupParent !== undefined
            ? (otherProps.popupParent as HTMLElement | null)
            : document.body
        }
        onGridReady={event => {
          gridApiRef.current = event.api;
          gridReadyRef.current = true;
          if (!serverSideMode && data) {
            dataRef.current = data;
            if (typeof event.api.setGridOption === 'function') {
              event.api.setGridOption('rowData', data);
              requestAnimationFrame(() => refreshLayout(0, { resetRowHeights: true }));
            }
          }
          if (onGridReady) onGridReady(event);
        }}
        onFirstDataRendered={handleFirstDataRendered}
        onSortChanged={handleSortChanged}
      />
    </div>
  );
};
