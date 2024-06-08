import { OrderTypes } from "@medusajs/types"

export enum OrderChangeStatus {
  /**
   * The order change is confirmed.
   */
  CONFIRMED = "confirmed",
  /**
   * The order change is declined.
   */
  DECLINED = "declined",
  /**
   * The order change is requested.
   */
  REQUESTED = "requested",
  /**
   * The order change is pending.
   */
  PENDING = "pending",
  /**
   * The order change is canceled.
   */
  CANCELED = "canceled",
}

export enum OrderChangeType {
  RETURN = "return",
  SWAP = "swap",
  CLAIM = "claim",
  ORDER_EDIT = "order_edit",
}

export interface CreateOrderChangeDTO extends OrderTypes.CreateOrderChangeDTO {
  change_type?: OrderChangeType
}
