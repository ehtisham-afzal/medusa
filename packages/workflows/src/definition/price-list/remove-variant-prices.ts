import { WorkflowTypes } from "@medusajs/types"
import {
  TransactionStepsDefinition,
  WorkflowManager,
} from "@medusajs/orchestration"
import { exportWorkflow, pipe } from "../../helper"

import { PriceListHandlers } from "../../handlers"
import { Workflows } from "../../definitions"

export enum RemoveVariantPricesActions {
  prepare = "prepare",
  removePriceSetPrices = "removePriceSetPrices",
}

const workflowSteps: TransactionStepsDefinition = {
  next: {
    action: RemoveVariantPricesActions.prepare,
    noCompensation: true,
    next: {
      action: RemoveVariantPricesActions.removePriceSetPrices,
      noCompensation: true,
    },
  },
}

const handlers = new Map([
  [
    RemoveVariantPricesActions.prepare,
    {
      invoke: pipe(
        {
          inputAlias: RemoveVariantPricesActions.prepare,
          merge: true,
          invoke: {
            from: RemoveVariantPricesActions.prepare,
          },
        },
        PriceListHandlers.prepareRemoveVariantPrices
      ),
    },
  ],
  [
    RemoveVariantPricesActions.removePriceSetPrices,
    {
      invoke: pipe(
        {
          merge: true,
          invoke: {
            from: RemoveVariantPricesActions.prepare,
            alias: PriceListHandlers.createPriceLists.aliases.priceLists,
          },
        },
        PriceListHandlers.removePriceListPriceSetPrices
      ),
    },
  ],
])

WorkflowManager.register(
  Workflows.RemovePriceListVariants,
  workflowSteps,
  handlers
)

export const removePriceListVariantPrices = exportWorkflow<
  WorkflowTypes.PriceListWorkflow.RemovePriceListVariantsWorkflowInputDTO,
  string[]
>(
  Workflows.RemovePriceListVariants,
  RemoveVariantPricesActions.removePriceSetPrices,
  async (data) => data
)
