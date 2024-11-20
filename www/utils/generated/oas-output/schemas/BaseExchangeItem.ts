/**
 * @schema BaseExchangeItem
 * type: object
 * description: The item's details.
 * x-schemaName: BaseExchangeItem
 * required:
 *   - id
 *   - exchange_id
 *   - order_id
 *   - item_id
 *   - quantity
 *   - created_at
 *   - updated_at
 * properties:
 *   id:
 *     type: string
 *     title: id
 *     description: The item's ID.
 *   exchange_id:
 *     type: string
 *     title: exchange_id
 *     description: The ID of the exchange this item belongs to.
 *   order_id:
 *     type: string
 *     title: order_id
 *     description: The ID of the order this item belongs to.
 *   item_id:
 *     type: string
 *     title: item_id
 *     description: The ID of the item in the order.
 *   quantity:
 *     type: number
 *     title: quantity
 *     description: The item's quantity.
 *   metadata:
 *     type: object
 *     description: The item's metadata, can hold custom key-value pairs.
 *   created_at:
 *     type: string
 *     format: date-time
 *     title: created_at
 *     description: The date the item was created.
 *   updated_at:
 *     type: string
 *     format: date-time
 *     title: updated_at
 *     description: The date the item was updated.
 * 
*/
