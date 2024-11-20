/**
 * @schema StoreCreateReturnItem
 * type: object
 * description: The details of the line item to create.
 * x-schemaName: StoreCreateReturnItem
 * required:
 *   - id
 *   - quantity
 * properties:
 *   id:
 *     type: string
 *     title: id
 *     description: The item's ID.
 *   quantity:
 *     type: number
 *     title: quantity
 *     description: The item's quantity.
 *   reason_id:
 *     type: string
 *     title: reason_id
 *     description: The ID of the associated return reason.
 *   note:
 *     type: string
 *     title: note
 *     description: A note with more details about the returned item.
 * 
*/
