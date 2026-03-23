import type { ReactNode } from 'react';
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
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

const TABLE_SHELL_CLASS_NAME = [
  'table-shell overflow-x-auto rounded-[20px] border border-border-soft bg-surface-card shadow-sm',
  '[-webkit-overflow-scrolling:touch]',
  '[&>div]:min-h-[240px] [&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none',
].join(' ');

const TABLE_CLASS_NAME =
  'data-table min-w-[620px] w-full border-collapse min-[768px]:min-w-[720px]';

const ROW_CLASS_NAME =
  'data-table__row border-t border-border-soft/90 first:border-t-0';

const CLICKABLE_ROW_CLASS_NAME = [
  ROW_CLASS_NAME,
  'data-table__row--clickable cursor-pointer transition-colors duration-fast hover:bg-primary/5',
].join(' ');

const HEAD_CELL_BASE_CLASS_NAME = [
  'data-table__cell data-table__cell--head px-4 py-3.5 align-middle text-[11px] font-bold uppercase tracking-[0.12em] max-[640px]:px-4',
  'border-b border-border-soft bg-background-subtle/90 text-text-muted',
].join(' ');

const BODY_CELL_BASE_CLASS_NAME =
  'data-table__cell px-4 py-3.5 align-middle text-sm text-text-primary max-[640px]:px-4';

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
  loading = false,
  emptyTitle = 'No records available',
  emptyDescription = 'Data will appear here once the page is connected to a data source.',
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={TABLE_SHELL_CLASS_NAME}>
        <LoadingState
          title="Loading table data"
          description="This table is waiting for data and will render rows when records are ready."
        />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={TABLE_SHELL_CLASS_NAME}>
        <EmptyState title={emptyTitle} description={emptyDescription} />
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
          {data.map((row, index) => (
            <tr
              key={getRowKey(row, index, rowKey)}
              className={onRowClick ? CLICKABLE_ROW_CLASS_NAME : ROW_CLASS_NAME}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
