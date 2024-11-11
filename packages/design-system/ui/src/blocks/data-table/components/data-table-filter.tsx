"use client"

import { EllipseMiniSolid, XMark } from "@medusajs/icons"
import { ColumnFilter } from "@tanstack/react-table"
import * as React from "react"

import { DropdownMenu } from "@/components/dropdown-menu"
import { clx } from "@/utils/clx"

import { DatePicker } from "../../../components/date-picker"
import { useDataTableContext } from "../context/use-data-table-context"
import { DateComparisonOperator, DateFilterProps, FilterOption } from "../types"
import { isDateComparisonOperator } from "../utils/is-date-comparison-operator"

interface DataTableFilterProps {
  filter: ColumnFilter
}

const DataTableFilter = ({ filter }: DataTableFilterProps) => {
  const { instance } = useDataTableContext()
  const [open, setOpen] = React.useState(filter.value === undefined)

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (
        !open &&
        (!filter.value ||
          (Array.isArray(filter.value) && filter.value.length === 0))
      ) {
        instance.removeFilter(filter.id)
      }

      setOpen(open)
    },
    [instance, filter.id, filter.value]
  )

  const removeFilter = React.useCallback(() => {
    instance.removeFilter(filter.id)
  }, [instance, filter.id])

  const meta = instance.getFilterMeta(filter.id)
  const { id, type, options, label, ...rest } = meta ?? {}

  const value = filter.value

  const displayValue = React.useMemo(() => {
    let displayValue: string | null = null

    if (Array.isArray(value)) {
      displayValue =
        value
          .map((v) => options?.find((o) => o.value === v)?.label)
          .join(", ") ?? null
    }

    if (isDateComparisonOperator(value)) {
      displayValue =
        options?.find((o) => {
          if (!isDateComparisonOperator(o.value)) {
            return false
          }

          return (
            (value.$gte === o.value.$gte || (!value.$gte && !o.value.$gte)) &&
            (value.$lte === o.value.$lte || (!value.$lte && !o.value.$lte)) &&
            (value.$gt === o.value.$gt || (!value.$gt && !o.value.$gt)) &&
            (value.$lt === o.value.$lt || (!value.$lt && !o.value.$lt))
          )
        })?.label ?? null
    }

    return displayValue
  }, [value, options])

  if (!meta) {
    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <div
        className={clx(
          "bg-ui-bg-component flex flex-shrink-0 items-center overflow-hidden rounded-md",
          "[&>*]:txt-compact-small-plus [&>*]:flex [&>*]:items-center [&>*]:justify-center",
          {
            "shadow-borders-base divide-x": displayValue,
            "border border-dashed": !displayValue,
          }
        )}
      >
        {displayValue && (
          <div className="text-ui-fg-muted whitespace-nowrap px-2 py-1">
            {label || id}
          </div>
        )}
        <DropdownMenu.Trigger
          className={clx(
            "text-ui-fg-subtle hover:bg-ui-bg-base-hover active:bg-ui-bg-base-pressed transition-fg whitespace-nowrap px-2 py-1 outline-none",
            {
              "text-ui-fg-muted": !displayValue,
            }
          )}
        >
          {displayValue || label || id}
        </DropdownMenu.Trigger>

        {displayValue && (
          <button
            type="button"
            className="text-ui-fg-muted hover:bg-ui-bg-base-hover active:bg-ui-bg-base-pressed transition-fg size-7 outline-none"
            onClick={removeFilter}
          >
            <XMark />
          </button>
        )}
      </div>
      <DropdownMenu.Content align="center">
        {(() => {
          switch (type) {
            case "select":
              return (
                <DataTableFilterSelectContent
                  filter={filter}
                  options={options as FilterOption<string>[]}
                />
              )
            case "radio":
              return (
                <DataTableFilterRadioContent
                  filter={filter}
                  options={options as FilterOption<string>[]}
                />
              )
            case "date":
              return (
                <DataTableFilterDateContent
                  filter={filter}
                  options={options as FilterOption<DateComparisonOperator>[]}
                  {...rest}
                />
              )
            default:
              return null
          }
        })()}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

type DataTableFilterDateContentProps = {
  filter: ColumnFilter
  options: FilterOption<DateComparisonOperator>[]
} & Pick<DateFilterProps, "format" | "rangeOptionLabel" | "disableRangeOption">

function getIsCustomOptionSelected(
  options: FilterOption<DateComparisonOperator>[],
  value: DateComparisonOperator | undefined
) {
  if (!value) {
    return false
  }

  const stringifiedValue = JSON.stringify(value)
  const stringifiedOptions = options.map((option) =>
    JSON.stringify(option.value)
  )

  if (stringifiedOptions.includes(stringifiedValue)) {
    return false
  }

  return value.$gte || value.$lte
}

const DataTableFilterDateContent = ({
  filter,
  options,
  format = "date",
  rangeOptionLabel = "Custom",
  disableRangeOption = false,
}: DataTableFilterDateContentProps) => {
  const currentValue = filter.value as DateComparisonOperator | undefined
  const { instance } = useDataTableContext()

  const [showCustom, setShowCustom] = React.useState(
    getIsCustomOptionSelected(options, currentValue)
  )

  const selectedValue = React.useMemo(() => {
    if (!currentValue) {
      return undefined
    }

    return JSON.stringify(currentValue)
  }, [currentValue])

  const onValueChange = React.useCallback(
    (valueStr: string) => {
      const value = JSON.parse(valueStr) as DateComparisonOperator
      instance.updateFilter({ ...filter, value })
    },
    [instance, filter]
  )

  const handleSelectCustom = React.useCallback(
    (event: Event) => {
      event.preventDefault()

      setShowCustom(true)
      instance.updateFilter({ ...filter, value: undefined })
    },
    [instance, filter]
  )

  const onCustomValueChange = React.useCallback(
    (input: "$gte" | "$lte", value: Date | null) => {
      const newCurrentValue = { ...currentValue }
      newCurrentValue[input] = value ? value.toISOString() : undefined
      instance.updateFilter({ ...filter, value: newCurrentValue })
    },
    [instance, filter]
  )

  const granularity = format === "date-time" ? "minute" : "day"

  const maxDate = currentValue?.$lte
    ? granularity === "minute"
      ? new Date(currentValue.$lte)
      : new Date(new Date(currentValue.$lte).setHours(23, 59, 59, 999))
    : undefined

  const minDate = currentValue?.$gte
    ? granularity === "minute"
      ? new Date(currentValue.$gte)
      : new Date(new Date(currentValue.$gte).setHours(0, 0, 0, 0))
    : undefined

  return (
    <React.Fragment>
      <DropdownMenu.RadioGroup
        value={selectedValue}
        onValueChange={onValueChange}
      >
        {options.map((option, idx) => {
          return (
            <DropdownMenu.RadioItem
              key={idx}
              value={JSON.stringify(option.value)}
            >
              {option.label}
            </DropdownMenu.RadioItem>
          )
        })}
      </DropdownMenu.RadioGroup>
      {!disableRangeOption && (
        <DropdownMenu.Item
          onSelect={handleSelectCustom}
          className="flex items-center gap-2"
        >
          <div className="flex size-[15px] items-center justify-center">
            {showCustom && <EllipseMiniSolid />}
          </div>
          <span>{rangeOptionLabel}</span>
        </DropdownMenu.Item>
      )}
      {!disableRangeOption && showCustom && (
        <React.Fragment>
          <DropdownMenu.Separator />
          <div className="flex flex-col gap-2">
            <DatePicker
              granularity={granularity}
              value={currentValue?.$gte ? new Date(currentValue.$gte) : null}
              onChange={(value) => onCustomValueChange("$gte", value)}
              maxValue={maxDate}
            />
            <DatePicker
              granularity={granularity}
              value={currentValue?.$lte ? new Date(currentValue.$lte) : null}
              onChange={(value) => onCustomValueChange("$lte", value)}
              minValue={minDate}
            />
          </div>
        </React.Fragment>
      )}
    </React.Fragment>
  )
}

type DataTableFilterSelectContentProps = {
  filter: ColumnFilter
  options: FilterOption<string>[]
}

const DataTableFilterSelectContent = ({
  filter,
  options,
}: DataTableFilterSelectContentProps) => {
  const { instance } = useDataTableContext()

  const currentValue = filter.value as string[] | undefined

  const getChecked = React.useCallback(
    (value: string) => {
      return (checked: boolean) => {
        if (!checked) {
          const newValues = currentValue?.filter((v) => v !== value)
          instance.updateFilter({
            ...filter,
            value: newValues,
          })

          return
        }

        instance.updateFilter({
          ...filter,
          value: [...(currentValue ?? []), value],
        })
      }
    },
    [instance, filter]
  )

  return (
    <React.Fragment>
      {options.map((option) => {
        return (
          <DropdownMenu.CheckboxItem
            onSelect={(e) => e.preventDefault()}
            key={option.value}
            checked={currentValue?.includes(option.value)}
            onCheckedChange={getChecked(option.value)}
          >
            {option.label}
          </DropdownMenu.CheckboxItem>
        )
      })}
    </React.Fragment>
  )
}

type DataTableFilterRadioContentProps = {
  filter: ColumnFilter
  options: FilterOption<string>[]
}

const DataTableFilterRadioContent = ({
  filter,
  options,
}: DataTableFilterRadioContentProps) => {
  const { instance } = useDataTableContext()

  const onValueChange = React.useCallback(
    (value: string) => {
      instance.updateFilter({ ...filter, value })
    },
    [instance, filter]
  )

  return (
    <DropdownMenu.RadioGroup
      value={filter.value as string}
      onValueChange={onValueChange}
    >
      {options.map((option) => {
        return (
          <DropdownMenu.RadioItem key={option.value} value={option.value}>
            {option.label}
          </DropdownMenu.RadioItem>
        )
      })}
    </DropdownMenu.RadioGroup>
  )
}

export { DataTableFilter }
export type { DataTableFilterProps }
