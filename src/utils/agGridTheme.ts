import { themeQuartz, iconSetQuartzLight } from 'ag-grid-community';

const baseThemeParams = {
  accentColor: '#5E6AD2',
  backgroundColor: '#FFFFFF',
  borderRadius: 6,
  columnBorder: false,
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  foregroundColor: '#1F2023',
  headerBackgroundColor: '#FFFFFF',
  headerForegroundColor: '#6B6F76',
  headerFontWeight: 500,
  rowBorder: true,
  rowHoverColor: '#F7F8F9',
  selectedRowBackgroundColor: '#EEF0FF',
  sidePanelBorder: false,
  wrapperBorder: true,
  wrapperBorderRadius: 8,
  oddRowBackgroundColor: '#FFFFFF',
  borderColor: '#E6E6E6',
};

export type AgGridVariant = 'normal' | 'compact';

const variantParams: Record<
  AgGridVariant,
  { fontSize: number; spacing: number; rowHeight: number; headerHeight: number }
> = {
  normal: {
    fontSize: 13,
    spacing: 8,
    rowHeight: 40,
    headerHeight: 36,
  },
  compact: {
    fontSize: 12,
    spacing: 2,
    rowHeight: 28,
    headerHeight: 28,
  },
};

export const createAgGridTheme = (variant: AgGridVariant = 'normal') => {
  const variantConfig = variantParams[variant];
  return themeQuartz.withPart(iconSetQuartzLight).withParams({
    ...baseThemeParams,
    fontSize: variantConfig.fontSize,
    spacing: variantConfig.spacing,
  });
};

export const getVariantDimensions = (variant: AgGridVariant = 'normal') => {
  return {
    rowHeight: variantParams[variant].rowHeight,
    headerHeight: variantParams[variant].headerHeight,
  };
};

export const customAgGridTheme = createAgGridTheme('normal');
