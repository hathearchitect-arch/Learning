'use client';

import { X } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from '@/components/datatable/data-table-view-options';
import { DataTableFacetedFilter } from '@/components/datatable/data-table-faceted-filter';

export interface FacetFilterOption {
  column: string;
  title: string;
  options: { label: string; value: string }[];
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filters?: FacetFilterOption[];
  multiRowActions?:
    | React.ReactNode
    | ((table: Table<TData>) => React.ReactNode);
  searchColumnName?: string; // Optional, for search functionality
  searchPlaceholder?: string;
}

export function DataTableToolbar<TData>({
  table,
  filters = [],
  multiRowActions,
  searchColumnName = 'name', // Default search column
  searchPlaceholder = 'Search...',
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={searchPlaceholder}
          value={
            (table.getColumn(searchColumnName)?.getFilterValue() as string) ??
            ''
          }
          onChange={(event) =>
            table
              .getColumn(searchColumnName)
              ?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {filters.map(
          (filter) =>
            table.getColumn(filter.column) && (
              <DataTableFacetedFilter
                key={filter.column}
                column={table.getColumn(filter.column)}
                title={filter.title}
                options={filter.options}
              />
            ),
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <DataTableViewOptions table={table} />
        {multiRowActions
          ? typeof multiRowActions === 'function'
            ? multiRowActions(table)
            : multiRowActions
          : null}
      </div>
    </div>
  );
}
