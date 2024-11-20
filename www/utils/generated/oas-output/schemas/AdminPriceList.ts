/**
 * @schema AdminPriceList
 * type: object
 * description: The price list's details.
 * x-schemaName: AdminPriceList
 * required:
 *   - id
 *   - title
 *   - description
 *   - rules
 *   - starts_at
 *   - ends_at
 *   - status
 *   - type
 *   - prices
 *   - created_at
 *   - updated_at
 *   - deleted_at
 * properties:
 *   id:
 *     type: string
 *     title: id
 *     description: The price list's ID.
 *   title:
 *     type: string
 *     title: title
 *     description: The price list's title.
 *   description:
 *     type: string
 *     title: description
 *     description: The price list's description.
 *   rules:
 *     type: object
 *     description: The price list's rules.
 *   starts_at:
 *     type: string
 *     title: starts_at
 *     description: The date the price list starts.
 *   ends_at:
 *     type: string
 *     title: ends_at
 *     description: The date the price list ends.
 *   status:
 *     type: string
 *     description: The price list's status.
 *     enum:
 *       - draft
 *       - active
 *   type:
 *     type: string
 *     description: The price list's type.
 *     enum:
 *       - sale
 *       - override
 *   prices:
 *     type: array
 *     description: The price list's prices.
 *     items:
 *       $ref: "#/components/schemas/AdminPriceListPrice"
 *   created_at:
 *     type: string
 *     format: date-time
 *     title: created_at
 *     description: The date the price list was created.
 *   updated_at:
 *     type: string
 *     format: date-time
 *     title: updated_at
 *     description: The date the price list was updated.
 *   deleted_at:
 *     type: string
 *     format: date-time
 *     title: deleted_at
 *     description: The date the price list was deleted.
 * 
*/
