import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState } from '../page';

type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  accessor?: keyof T | ((row: T) => ReactNode);
  render?: (row: T) => ReactNode;
  align?: DataTableAlign;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey?: keyof T | ((row: T, index: number) => string);
  selectedRowKey?: string | null;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T, index: number) => string;
}

const TABLE_SHELL_CLASS_NAME = [
  'table-shell overflow-x-auto rounded-xl bg-surface-card p-2 shadow-sm ring-1 ring-border-soft/40',
  '[-webkit-overflow-scrolling:touch]',
  '[&>div]:min-h-[240px] [&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none [&>div]:ring-0',
].join(' ');

const TABLE_CLASS_NAME =
  'data-table min-w-[620px] w-full border-separate border-spacing-y-1.5 min-[768px]:min-w-[720px]';

const ROW_CLASS_NAME =
  'data-table__row bg-surface-subtle/70';


const CLICKABLE_ROW_CLASS_NAME = [
  ROW_CLASS_NAME,
  'data-table__row--clickable cursor-pointer transition-colors duration-fast hover:bg-primary/8',
].join(' ');

const SELECTED_ROW_CLASS_NAME =
  'data-table__row--selected bg-primary/10 shadow-[inset_0_0_0_1px_rgb(var(--color-primary)/0.3)]';

const HEAD_CELL_BASE_CLASS_NAME = [
  'data-table__cell data-table__cell--head px-4 py-3.5 align-middle text-[11px] font-bold uppercase tracking-[0.12em] max-[640px]:px-4',
  'bg-transparent text-text-muted',
].join(' ');

const BODY_CELL_BASE_CLASS_NAME =
  'data-table__cell px-4 py-3.5 align-middle text-sm text-text-primary first:rounded-l-lg last:rounded-r-lg max-[640px]:px-4';

const ALIGN_CLASS_NAMES: Record<DataTableAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function getRowKey<T>(
  row: T,
  index: number,
  rowKey?: keyof T | ((row: T, index: number) => string),
): string {
  if (typeof rowKey === 'function') {
    return rowKey(row, index);
  }

  if (rowKey) {
    const value = row[rowKey];
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : `row-${index}`;
  }

  return `row-${index}`;
}

function getCellContent<T>(row: T, column: DataTableColumn<T>): ReactNode {
  if (column.render) {
    return column.render(row);
  }

  if (typeof column.accessor === 'function') {
    return column.accessor(row);
  }

  if (column.accessor) {
    const value = row[column.accessor];
    return value as ReactNode;
  }

  return null;
}

function DataTable<T>({
  data,
  columns,
  rowKey,
  selectedRowKey,
  loading = false,
  emptyTitle,
  emptyDescription,
  onRowClick,
  getRowClassName,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyTitle = emptyTitle ?? t('shared.table.emptyTitle');
  const resolvedEmptyDescription =
    emptyDescription ?? t('shared.table.emptyDescription');

  if (loading) {
    return (
      <div className={TABLE_SHELL_CLASS_NAME}>
        <LoadingState
          title={t('shared.table.loadingTitle')}
          description={t('shared.table.loadingDescription')}
        />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={TABLE_SHELL_CLASS_NAME}>
        <EmptyState
          title={resolvedEmptyTitle}
          description={resolvedEmptyDescription}
        />
      </div>
    );
  }

  return (
    <div className={TABLE_SHELL_CLASS_NAME}>
      <table className={TABLE_CLASS_NAME}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={[
                  HEAD_CELL_BASE_CLASS_NAME,
                  `data-table__cell--${column.align ?? 'left'}`,
                  ALIGN_CLASS_NAMES[column.align ?? 'left'],
                ].join(' ')}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const resolvedRowKey = getRowKey(row, index, rowKey);
            const isSelected = selectedRowKey === resolvedRowKey;

            return (
              <tr
                key={resolvedRowKey}
                className={[
                  onRowClick ? CLICKABLE_ROW_CLASS_NAME : ROW_CLASS_NAME,
                  getRowClassName ? getRowClassName(row, index) : '',
                  isSelected ? SELECTED_ROW_CLASS_NAME : '',
                ].join(' ')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                aria-selected={isSelected}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={[
                      BODY_CELL_BASE_CLASS_NAME,
                      `data-table__cell--${column.align ?? 'left'}`,
                      ALIGN_CLASS_NAMES[column.align ?? 'left'],
                    ].join(' ')}
                  >
                    {getCellContent(row, column)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
