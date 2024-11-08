import type {
  AccessorFn,
  AccessorFnColumnDef,
  AccessorKeyColumnDef,
  CellContext,
  ColumnFilter,
  ColumnSort,
  DeepKeys,
  DeepValue,
  DisplayColumnDef,
  IdentifiedColumnDef,
  PaginationState,
  RowData,
  RowSelectionState,
} from "@tanstack/react-table"

export type OrderByState<TData extends RowData> = {
  [K in keyof TData]?: {
    label: string
    value?: TData[K]
  }
}

type DataTableAction<TData> = {
  label: string
  onClick: (ctx: CellContext<TData, unknown>) => void
  icon?: React.ReactNode
}

export interface ActionColumnDef<TData>
  extends Pick<DisplayColumnDef<TData>, "meta"> {
  actions: DataTableAction<TData>[] |  DataTableAction<TData>[][]
}

export interface SelectColumnDef<TData>
  extends Pick<DisplayColumnDef<TData>, "cell" | "header"> {}

export type SortableColumnDef = {
  sortLabel?: string
  sortAscLabel?: string
  sortDescLabel?: string
}

export type SortableColumnDefMeta = {
  ___sortMetaData?: SortableColumnDef
}

export type ActionColumnDefMeta<TData> = {
  ___actions?: DataTableAction<TData>[] | DataTableAction<TData>[][]
}

export interface DataTableColumnHelper<TData> {
  accessor: <
    TAccessor extends AccessorFn<TData> | DeepKeys<TData>,
    TValue extends TAccessor extends AccessorFn<TData, infer TReturn>
      ? TReturn
      : TAccessor extends DeepKeys<TData>
      ? DeepValue<TData, TAccessor>
      : never
  >(
    accessor: TAccessor,
    column: TAccessor extends AccessorFn<TData>
      ? DisplayColumnDef<TData, TValue> & SortableColumnDef
      : IdentifiedColumnDef<TData, TValue> & SortableColumnDef
  ) => TAccessor extends AccessorFn<TData>
    ? AccessorFnColumnDef<TData, TValue>
    : AccessorKeyColumnDef<TData, TValue>
  display: (column: DisplayColumnDef<TData>) => DisplayColumnDef<TData, unknown>
  action: (props: ActionColumnDef<TData>) => DisplayColumnDef<TData, unknown>
  select: (props?: SelectColumnDef<TData>) => DisplayColumnDef<TData, unknown>
}

interface DataTableColumnFilter extends ColumnFilter {}

export interface DataTableSortingState extends ColumnSort {}
export interface DataTableRowSelectionState extends RowSelectionState {}
export interface DataTablePaginationState extends PaginationState {}
export interface DataTableFilteringState extends Record<string, DataTableColumnFilter> {}

export type FilterType = "text" | "radio" | "select" | "date"
export type FilterOption<T = string> = {
  label: string
  value: T
}

interface BaseFilterProps {
  type: FilterType
  label: string
}

export interface TextFilterProps extends BaseFilterProps {
  type: "text"
}

export interface RadioFilterProps extends BaseFilterProps {
  type: "radio"
  options: FilterOption[]
}

export interface SelectFilterProps extends BaseFilterProps {
  type: "select"
  options: FilterOption[]
}

export interface DateFilterProps extends BaseFilterProps {
  type: "date"
  format: "date" | "date-time"
  options: FilterOption<DateComparisonOperator>[]
}

export type DataTableFilterProps = TextFilterProps | RadioFilterProps | SelectFilterProps | DateFilterProps

export type DataTableFilter<T extends DataTableFilterProps = DataTableFilterProps> = T & {
  id: string
}

export enum DataTableEmptyState {
  EMPTY = "EMPTY",
  FILTERED_EMPTY = "FILTERED_EMPTY",
  POPULATED = "POPULATED",
}

export type DateComparisonOperator = {
  /**
   * The filtered date must be greater than or equal to this value.
   */
  $gte?: string
  /**
   * The filtered date must be less than or equal to this value.
   */
  $lte?: string
  /**
   * The filtered date must be less than this value.
   */
  $lt?: string
  /**
   * The filtered date must be greater than this value.
   */
  $gt?: string
}

type CommandAction = (selection: DataTableRowSelectionState) => void | Promise<void>

export interface DataTableCommand {
  label: string
  action: CommandAction
  shortcut: string
}