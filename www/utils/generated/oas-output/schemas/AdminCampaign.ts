/**
 * @schema AdminCampaign
 * type: object
 * description: The campaign's details.
 * x-schemaName: AdminCampaign
 * required:
 *   - id
 *   - name
 *   - description
 *   - currency
 *   - campaign_identifier
 *   - starts_at
 *   - ends_at
 *   - budget
 * properties:
 *   id:
 *     type: string
 *     title: id
 *     description: The campaign's ID.
 *   name:
 *     type: string
 *     title: name
 *     description: The campaign's name.
 *   description:
 *     type: string
 *     title: description
 *     description: The campaign's description.
 *   currency:
 *     type: string
 *     title: currency
 *     description: The campaign's currency.
 *   campaign_identifier:
 *     type: string
 *     title: campaign_identifier
 *     description: The campaign's campaign identifier.
 *   starts_at:
 *     type: string
 *     title: starts_at
 *     description: The campaign's starts at.
 *   ends_at:
 *     type: string
 *     title: ends_at
 *     description: The campaign's ends at.
 *   budget:
 *     type: object
 *     description: The campaign's budget.
 *     required:
 *       - id
 *       - type
 *       - currency_code
 *       - limit
 *       - used
 *     properties:
 *       id:
 *         type: string
 *         title: id
 *         description: The budget's ID.
 *       type:
 *         type: string
 *         description: The budget's type.
 *         enum:
 *           - spend
 *           - usage
 *       currency_code:
 *         type: string
 *         title: currency_code
 *         description: The budget's currency code.
 *       limit:
 *         type: number
 *         title: limit
 *         description: The budget's limit.
 *       used:
 *         type: number
 *         title: used
 *         description: The budget's used.
 * 
*/
