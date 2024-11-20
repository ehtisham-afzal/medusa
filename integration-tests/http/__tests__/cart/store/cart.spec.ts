import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  Modules,
  PriceListStatus,
  PriceListType,
  ProductStatus,
  PromotionRuleOperator,
  PromotionType,
} from "@medusajs/utils"
import {
  createAdminUser,
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../../helpers/create-admin-user"
import { setupTaxStructure } from "../../../../modules/__tests__/fixtures"
import { createAuthenticatedCustomer } from "../../../../modules/helpers/create-authenticated-customer"

jest.setTimeout(100000)

const env = { MEDUSA_FF_MEDUSA_V2: true }
const adminHeaders = { headers: { "x-medusa-access-token": "test_token" } }

const shippingAddressData = {
  address_1: "test address 1",
  address_2: "test address 2",
  city: "SF",
  country_code: "US",
  province: "CA",
  postal_code: "94016",
}

const productData = {
  title: "Medusa T-Shirt",
  handle: "t-shirt",
  status: ProductStatus.PUBLISHED,
  options: [
    {
      title: "Size",
      values: ["S"],
    },
    {
      title: "Color",
      values: ["Black", "White"],
    },
  ],
  variants: [
    {
      title: "S / Black",
      sku: "SHIRT-S-BLACK",
      options: {
        Size: "S",
        Color: "Black",
      },
      manage_inventory: false,
      prices: [
        {
          amount: 1500,
          currency_code: "usd",
        },
        {
          amount: 1500,
          currency_code: "eur",
        },
        {
          amount: 1300,
          currency_code: "dkk",
        },
      ],
    },
    {
      title: "S / White",
      sku: "SHIRT-S-WHITE",
      options: {
        Size: "S",
        Color: "White",
      },
      manage_inventory: false,
      prices: [
        {
          amount: 1500,
          currency_code: "usd",
        },
        {
          amount: 1500,
          currency_code: "eur",
        },
        {
          amount: 1300,
          currency_code: "dkk",
        },
      ],
    },
  ],
}

medusaIntegrationTestRunner({
  env,
  testSuite: ({ dbConnection, getContainer, api }) => {
    describe("Store Carts API", () => {
      let appContainer
      let storeHeaders
      let storeHeadersWithCustomer
      let region,
        noAutomaticRegion,
        product,
        salesChannel,
        cart,
        customer,
        promotion

      beforeAll(async () => {
        appContainer = getContainer()
      })

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, appContainer)
        const publishableKey = await generatePublishableKey(appContainer)
        storeHeaders = generateStoreHeaders({ publishableKey })

        const result = await createAuthenticatedCustomer(api, storeHeaders, {
          first_name: "tony",
          last_name: "stark",
          email: "tony@stark-industries.com",
        })

        customer = result.customer
        storeHeadersWithCustomer = {
          headers: {
            ...storeHeaders.headers,
            authorization: `Bearer ${result.jwt}`,
          },
        }

        await setupTaxStructure(appContainer.resolve(Modules.TAX))

        region = (
          await api.post(
            "/admin/regions",
            { name: "US", currency_code: "usd", countries: ["us"] },
            adminHeaders
          )
        ).data.region

        noAutomaticRegion = (
          await api.post(
            "/admin/regions",
            { name: "EUR", currency_code: "eur", automatic_taxes: false },
            adminHeaders
          )
        ).data.region

        product = (await api.post("/admin/products", productData, adminHeaders))
          .data.product

        salesChannel = (
          await api.post(
            "/admin/sales-channels",
            { name: "Webshop", description: "channel" },
            adminHeaders
          )
        ).data.sales_channel

        await api.post(
          "/admin/price-preferences",
          {
            attribute: "currency_code",
            value: "usd",
            is_tax_inclusive: true,
          },
          adminHeaders
        )

        promotion = (
          await api.post(
            `/admin/promotions`,
            {
              code: "PROMOTION_APPLIED",
              type: PromotionType.STANDARD,
              application_method: {
                type: "fixed",
                target_type: "items",
                allocation: "each",
                value: 100,
                max_quantity: 1,
                currency_code: "usd",
                target_rules: [
                  {
                    attribute: "product_id",
                    operator: "in",
                    values: [product.id],
                  },
                ],
              },
            },
            adminHeaders
          )
        ).data.promotion
      })

      describe("POST /store/carts", () => {
        it("should succesffully create a cart", async () => {
          const response = await api.post(
            `/store/carts`,
            {
              currency_code: "usd",
              sales_channel_id: salesChannel.id,
              region_id: region.id,
              shipping_address: shippingAddressData,
              items: [{ variant_id: product.variants[0].id, quantity: 1 }],
            },
            storeHeadersWithCustomer
          )

          expect(response.status).toEqual(200)
          expect(response.data.cart).toEqual(
            expect.objectContaining({
              currency_code: "usd",
              items: expect.arrayContaining([
                expect.objectContaining({
                  unit_price: 1500,
                  compare_at_unit_price: null,
                  is_tax_inclusive: true,
                  quantity: 1,
                  tax_lines: [
                    expect.objectContaining({
                      description: "CA Default Rate",
                      code: "CADEFAULT",
                      rate: 5,
                      provider_id: "system",
                    }),
                  ],
                  adjustments: [],
                }),
              ]),
            })
          )
        })

        describe("with sale price lists", () => {
          let priceList

          beforeEach(async () => {
            priceList = (
              await api.post(
                `/admin/price-lists`,
                {
                  title: "test price list",
                  description: "test",
                  status: PriceListStatus.ACTIVE,
                  type: PriceListType.SALE,
                  prices: [
                    {
                      amount: 350,
                      currency_code: "usd",
                      variant_id: product.variants[0].id,
                    },
                  ],
                },
                adminHeaders
              )
            ).data.price_list
          })

          it("should successfully create cart with price from price list", async () => {
            const response = await api.post(
              `/store/carts`,
              {
                currency_code: "usd",
                sales_channel_id: salesChannel.id,
                region_id: region.id,
                shipping_address: shippingAddressData,
                items: [{ variant_id: product.variants[0].id, quantity: 1 }],
              },
              storeHeadersWithCustomer
            )

            expect(response.status).toEqual(200)
            expect(response.data.cart).toEqual(
              expect.objectContaining({
                currency_code: "usd",
                items: expect.arrayContaining([
                  expect.objectContaining({
                    unit_price: 350,
                    compare_at_unit_price: 1500,
                    is_tax_inclusive: true,
                    quantity: 1,
                    tax_lines: [
                      expect.objectContaining({
                        description: "CA Default Rate",
                        code: "CADEFAULT",
                        rate: 5,
                        provider_id: "system",
                      }),
                    ],
                    adjustments: [],
                  }),
                ]),
              })
            )
          })
        })
      })

      describe("POST /store/carts/:id/line-items", () => {
        beforeEach(async () => {
          cart = (
            await api.post(
              `/store/carts`,
              {
                currency_code: "usd",
                sales_channel_id: salesChannel.id,
                region_id: region.id,
                shipping_address: shippingAddressData,
                items: [{ variant_id: product.variants[0].id, quantity: 1 }],
                promo_codes: [promotion.code],
              },
              storeHeadersWithCustomer
            )
          ).data.cart
        })

        it("should add item to cart", async () => {
          let response = await api.post(
            `/store/carts/${cart.id}/line-items`,
            {
              variant_id: product.variants[0].id,
              quantity: 1,
            },
            storeHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              currency_code: "usd",
              items: expect.arrayContaining([
                expect.objectContaining({
                  unit_price: 1500,
                  compare_at_unit_price: null,
                  is_tax_inclusive: true,
                  quantity: 2,
                  tax_lines: [
                    expect.objectContaining({
                      description: "CA Default Rate",
                      code: "CADEFAULT",
                      rate: 5,
                      provider_id: "system",
                    }),
                  ],
                  adjustments: [
                    {
                      id: expect.any(String),
                      code: "PROMOTION_APPLIED",
                      promotion_id: promotion.id,
                      amount: 100,
                    },
                  ],
                }),
              ]),
            })
          )
        })

        describe("with sale price lists", () => {
          let priceList

          beforeEach(async () => {
            priceList = (
              await api.post(
                `/admin/price-lists`,
                {
                  title: "test price list",
                  description: "test",
                  status: PriceListStatus.ACTIVE,
                  type: PriceListType.SALE,
                  prices: [
                    {
                      amount: 350,
                      currency_code: "usd",
                      variant_id: product.variants[0].id,
                    },
                  ],
                },
                adminHeaders
              )
            ).data.price_list
          })

          it("should add price from price list and set compare_at_unit_price", async () => {
            let response = await api.post(
              `/store/carts/${cart.id}/line-items`,
              {
                variant_id: product.variants[0].id,
                quantity: 1,
              },
              storeHeaders
            )

            expect(response.status).toEqual(200)
            expect(response.data.cart).toEqual(
              expect.objectContaining({
                id: cart.id,
                currency_code: "usd",
                items: expect.arrayContaining([
                  expect.objectContaining({
                    unit_price: 350,
                    compare_at_unit_price: 1500,
                    is_tax_inclusive: true,
                    quantity: 2,
                    tax_lines: [
                      expect.objectContaining({
                        description: "CA Default Rate",
                        code: "CADEFAULT",
                        rate: 5,
                        provider_id: "system",
                      }),
                    ],
                    adjustments: [
                      {
                        id: expect.any(String),
                        code: "PROMOTION_APPLIED",
                        promotion_id: promotion.id,
                        amount: 100,
                      },
                    ],
                  }),
                ]),
              })
            )
          })
        })
      })

      describe("POST /store/carts/:id/complete", () => {
        beforeEach(async () => {
          cart = (
            await api.post(
              `/store/carts`,
              {
                currency_code: "usd",
                sales_channel_id: salesChannel.id,
                region_id: region.id,
                shipping_address: shippingAddressData,
                items: [{ variant_id: product.variants[0].id, quantity: 1 }],
                promo_codes: [promotion.code],
              },
              storeHeadersWithCustomer
            )
          ).data.cart

          const paymentCollection = (
            await api.post(
              `/store/payment-collections`,
              { cart_id: cart.id },
              storeHeaders
            )
          ).data.payment_collection

          await api.post(
            `/store/payment-collections/${paymentCollection.id}/payment-sessions`,
            { provider_id: "pp_system_default" },
            storeHeaders
          )
        })

        it("should successfully complete cart", async () => {
          const response = await api.post(
            `/store/carts/${cart.id}/complete`,
            {},
            storeHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.order).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              currency_code: "usd",
              items: expect.arrayContaining([
                expect.objectContaining({
                  unit_price: 1500,
                  compare_at_unit_price: null,
                  quantity: 1,
                }),
              ]),
            })
          )
        })

        describe("with sale price lists", () => {
          let priceList

          beforeEach(async () => {
            priceList = (
              await api.post(
                `/admin/price-lists`,
                {
                  title: "test price list",
                  description: "test",
                  status: PriceListStatus.ACTIVE,
                  type: PriceListType.SALE,
                  prices: [
                    {
                      amount: 350,
                      currency_code: "usd",
                      variant_id: product.variants[0].id,
                    },
                  ],
                },
                adminHeaders
              )
            ).data.price_list

            await api.post(
              `/store/carts/${cart.id}/line-items`,
              { variant_id: product.variants[0].id, quantity: 1 },
              storeHeaders
            )

            const paymentCollection = (
              await api.post(
                `/store/payment-collections`,
                { cart_id: cart.id },
                storeHeaders
              )
            ).data.payment_collection

            await api.post(
              `/store/payment-collections/${paymentCollection.id}/payment-sessions`,
              { provider_id: "pp_system_default" },
              storeHeaders
            )
          })

          it("should add price from price list and set compare_at_unit_price for order item", async () => {
            const response = await api.post(
              `/store/carts/${cart.id}/complete`,
              { variant_id: product.variants[0].id, quantity: 1 },
              storeHeaders
            )

            expect(response.status).toEqual(200)
            expect(response.data.order).toEqual(
              expect.objectContaining({
                items: expect.arrayContaining([
                  expect.objectContaining({
                    unit_price: 350,
                    compare_at_unit_price: 1500,
                    is_tax_inclusive: true,
                    quantity: 2,
                  }),
                ]),
              })
            )
          })
        })
      })

      describe("POST /store/carts/:id", () => {
        let otherRegion

        beforeEach(async () => {
          const cartData = {
            currency_code: "usd",
            sales_channel_id: salesChannel.id,
            region_id: region.id,
            shipping_address: shippingAddressData,
            items: [{ variant_id: product.variants[0].id, quantity: 1 }],
            promo_codes: [promotion.code],
          }

          cart = (await api.post(`/store/carts`, cartData, storeHeaders)).data
            .cart

          otherRegion = (
            await api.post(
              "/admin/regions",
              { name: "dk", currency_code: "dkk", countries: ["dk"] },
              adminHeaders
            )
          ).data.region
        })

        it("should update prices when region is changed", async () => {
          let updated = await api.post(
            `/store/carts/${cart.id}/line-items`,
            { variant_id: product.variants[0].id, quantity: 1 },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              currency_code: "usd",
              items: [
                expect.objectContaining({
                  unit_price: 1500,
                  quantity: 2,
                }),
              ],
            })
          )

          updated = await api.post(
            `/store/carts/${cart.id}`,
            { region_id: otherRegion.id },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              currency_code: "dkk",
              items: [
                expect.objectContaining({
                  unit_price: 1300,
                  quantity: 2,
                }),
              ],
            })
          )

          updated = await api.post(
            `/store/carts/${cart.id}/line-items`,
            { variant_id: product.variants[0].id, quantity: 1 },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              currency_code: "dkk",
              items: [
                expect.objectContaining({
                  unit_price: 1300,
                  quantity: 3,
                }),
              ],
            })
          )
        })

        it("should update a cart with promo codes with a replace action", async () => {
          const newPromotion = (
            await api.post(
              `/admin/promotions`,
              {
                code: "PROMOTION_TEST",
                type: PromotionType.STANDARD,
                application_method: {
                  type: "fixed",
                  target_type: "items",
                  allocation: "across",
                  currency_code: "usd",
                  value: 1000,
                  apply_to_quantity: 1,
                  target_rules: [
                    {
                      attribute: "product_id",
                      operator: PromotionRuleOperator.IN,
                      values: [product.id],
                    },
                  ],
                },
              },
              adminHeaders
            )
          ).data.promotion

          await api.post(
            `/store/carts/${cart.id}/line-items`,
            {
              variant_id: product.variants[0].id,
              quantity: 1,
            },
            storeHeaders
          )

          // Should remove earlier adjustments from other promocodes
          let updated = await api.post(
            `/store/carts/${cart.id}`,
            { promo_codes: [newPromotion.code] },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              items: [
                expect.objectContaining({
                  adjustments: [
                    expect.objectContaining({
                      code: newPromotion.code,
                    }),
                  ],
                }),
              ],
            })
          )

          // Should remove all adjustments from other promo codes
          updated = await api.post(
            `/store/carts/${cart.id}`,
            { promo_codes: [] },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              items: [
                expect.objectContaining({
                  adjustments: [],
                }),
              ],
            })
          )
        })

        it("should not generate tax lines if automatic taxes is false", async () => {
          let updated = await api.post(
            `/store/carts/${cart.id}`,
            {},
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              items: [
                expect.objectContaining({
                  tax_lines: [
                    expect.objectContaining({
                      description: "CA Default Rate",
                      code: "CADEFAULT",
                      rate: 5,
                      provider_id: "system",
                    }),
                  ],
                }),
              ],
            })
          )

          updated = await api.post(
            `/store/carts/${cart.id}`,
            { region_id: noAutomaticRegion.id },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              items: [
                expect.objectContaining({
                  tax_lines: [],
                }),
              ],
            })
          )
        })

        it("should update a cart's region, sales channel, customer data and tax lines", async () => {
          const newSalesChannel = (
            await api.post(
              "/admin/sales-channels",
              { name: "Webshop", description: "channel" },
              adminHeaders
            )
          ).data.sales_channel

          let updated = await api.post(
            `/store/carts/${cart.id}`,
            {
              region_id: noAutomaticRegion.id,
              email: "tony@stark.com",
              sales_channel_id: newSalesChannel.id,
            },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              region: expect.objectContaining({
                id: noAutomaticRegion.id,
                currency_code: "eur",
              }),
              email: "tony@stark.com",
              customer: expect.objectContaining({
                email: "tony@stark.com",
              }),
              sales_channel_id: newSalesChannel.id,
            })
          )
        })

        it("should update tax lines on cart items when region changes", async () => {
          let response = await api.post(
            `/store/carts/${cart.id}`,
            {
              region_id: otherRegion.id,
              shipping_address: {
                country_code: "dk",
              },
            },
            storeHeaders
          )

          expect(response.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              currency_code: "dkk",
              region_id: otherRegion.id,
              items: expect.arrayContaining([
                expect.objectContaining({
                  unit_price: 1300,
                  quantity: 1,
                  tax_lines: [
                    // Uses the danish default rate
                    expect.objectContaining({
                      description: "Denmark Default Rate",
                      code: "DK_DEF",
                      rate: 25,
                      provider_id: "system",
                    }),
                  ],
                }),
              ]),
            })
          )
        })

        it("should update region + set shipping address country code to dk when region has only one country", async () => {
          const updated = await api.post(
            `/store/carts/${cart.id}`,
            {
              region_id: otherRegion.id,
            },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              currency_code: "dkk",
              region: expect.objectContaining({
                id: otherRegion.id,
                currency_code: "dkk",
                countries: [expect.objectContaining({ iso_2: "dk" })],
              }),
              shipping_address: expect.objectContaining({
                country_code: "dk",
              }),
            })
          )
        })

        it("should update region + set shipping address to null when region has more than one country", async () => {
          const regionWithMultipleCountries = (
            await api.post(
              "/admin/regions",
              { name: "dks", currency_code: "dkk", countries: ["ae", "no"] },
              adminHeaders
            )
          ).data.region

          const updated = await api.post(
            `/store/carts/${cart.id}`,
            { region_id: regionWithMultipleCountries.id },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              currency_code: "dkk",
              region: expect.objectContaining({
                currency_code: "dkk",
                countries: expect.arrayContaining([
                  expect.objectContaining({ iso_2: "ae" }),
                  expect.objectContaining({ iso_2: "no" }),
                ]),
              }),
              shipping_address: null,
            })
          )
        })

        it("should update region and shipping address when country code is within region", async () => {
          const updated = await api.post(
            `/store/carts/${cart.id}`,
            {
              region_id: region.id,
              shipping_address: {
                country_code: "us",
              },
            },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              region: expect.objectContaining({
                id: region.id,
                countries: [expect.objectContaining({ iso_2: "us" })],
              }),
              shipping_address: expect.objectContaining({
                country_code: "us",
              }),
            })
          )
        })

        it("should throw when updating shipping address country code when country is not within region", async () => {
          let errResponse = await api
            .post(
              `/store/carts/${cart.id}`,
              {
                shipping_address: {
                  country_code: "dk",
                },
              },
              storeHeaders
            )
            .catch((e) => e)

          expect(errResponse.response.status).toEqual(400)
          expect(errResponse.response.data.message).toEqual(
            `Country with code dk is not within region ${region.name}`
          )
        })

        it("should throw when updating region and shipping address, but shipping address country code is not within region", async () => {
          let errResponse = await api
            .post(
              `/store/carts/${cart.id}`,
              {
                region_id: region.id,
                shipping_address: {
                  country_code: "dk",
                },
              },
              storeHeaders
            )
            .catch((e) => e)

          expect(errResponse.response.status).toEqual(400)
          expect(errResponse.response.data.message).toEqual(
            `Country with code dk is not within region ${region.name}`
          )
        })

        it("should remove tax lines on cart items and shipping methods when country changes and there is no tax region for that country", async () => {
          const stockLocation = (
            await api.post(
              `/admin/stock-locations`,
              { name: "test location" },
              adminHeaders
            )
          ).data.stock_location

          await api.post(
            `/admin/stock-locations/${stockLocation.id}/sales-channels`,
            { add: [salesChannel.id] },
            adminHeaders
          )

          const shippingProfile = (
            await api.post(
              `/admin/shipping-profiles`,
              { name: `test-${stockLocation.id}`, type: "default" },
              adminHeaders
            )
          ).data.shipping_profile

          const fulfillmentSets = (
            await api.post(
              `/admin/stock-locations/${stockLocation.id}/fulfillment-sets?fields=*fulfillment_sets`,
              {
                name: `Test-${shippingProfile.id}`,
                type: "test-type",
              },
              adminHeaders
            )
          ).data.stock_location.fulfillment_sets

          const fulfillmentSet = (
            await api.post(
              `/admin/fulfillment-sets/${fulfillmentSets[0].id}/service-zones`,
              {
                name: `Test-${shippingProfile.id}`,
                geo_zones: [
                  { type: "country", country_code: "it" },
                  { type: "country", country_code: "us" },
                ],
              },
              adminHeaders
            )
          ).data.fulfillment_set

          await api.post(
            `/admin/stock-locations/${stockLocation.id}/fulfillment-providers`,
            { add: ["manual_test-provider"] },
            adminHeaders
          )

          const shippingOption = (
            await api.post(
              `/admin/shipping-options`,
              {
                name: `Test shipping option ${fulfillmentSet.id}`,
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                provider_id: "manual_test-provider",
                price_type: "flat",
                type: {
                  label: "Test type",
                  description: "Test description",
                  code: "test-code",
                },
                prices: [
                  { currency_code: "usd", amount: 1000 },
                  { currency_code: "eur", amount: 1000 },
                  { currency_code: "dkk", amount: 1000 },
                ],
                rules: [],
              },
              adminHeaders
            )
          ).data.shipping_option

          const regionWithoutTax = (
            await api.post(
              "/admin/regions",
              { name: "Italy", currency_code: "eur", countries: ["it"] },
              adminHeaders
            )
          ).data.region

          await api.post(
            `/store/carts/${cart.id}`,
            { region_id: regionWithoutTax.id },
            storeHeaders
          )

          await api.post(
            `/store/carts/${cart.id}/shipping-methods`,
            { option_id: shippingOption.id },
            storeHeaders
          )

          const response = await api.post(
            `/store/carts/${cart.id}`,
            { region_id: regionWithoutTax.id },
            storeHeaders
          )

          expect(response.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              currency_code: "eur",
              region_id: regionWithoutTax.id,
              items: expect.arrayContaining([
                expect.objectContaining({
                  tax_lines: [
                    // Italy has no tax region, so we clear the tax lines
                  ],
                }),
              ]),
              shipping_methods: expect.arrayContaining([
                expect.objectContaining({
                  tax_lines: [
                    // Italy has no tax region, so we clear the tax lines
                  ],
                }),
              ]),
            })
          )
        })

        it("should remove invalid shipping methods", async () => {
          const stockLocation = (
            await api.post(
              `/admin/stock-locations`,
              { name: "test location" },
              adminHeaders
            )
          ).data.stock_location

          await api.post(
            `/admin/stock-locations/${stockLocation.id}/sales-channels`,
            { add: [salesChannel.id] },
            adminHeaders
          )

          const shippingProfile = (
            await api.post(
              `/admin/shipping-profiles`,
              { name: `test-${stockLocation.id}`, type: "default" },
              adminHeaders
            )
          ).data.shipping_profile

          const fulfillmentSets = (
            await api.post(
              `/admin/stock-locations/${stockLocation.id}/fulfillment-sets?fields=*fulfillment_sets`,
              {
                name: `Test-${shippingProfile.id}`,
                type: "test-type",
              },
              adminHeaders
            )
          ).data.stock_location.fulfillment_sets

          const fulfillmentSet = (
            await api.post(
              `/admin/fulfillment-sets/${fulfillmentSets[0].id}/service-zones`,
              {
                name: `Test-${shippingProfile.id}`,
                geo_zones: [{ type: "country", country_code: "it" }],
              },
              adminHeaders
            )
          ).data.fulfillment_set

          await api.post(
            `/admin/stock-locations/${stockLocation.id}/fulfillment-providers`,
            { add: ["manual_test-provider"] },
            adminHeaders
          )

          const shippingOption = (
            await api.post(
              `/admin/shipping-options`,
              {
                name: `Test shipping option ${fulfillmentSet.id}`,
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                provider_id: "manual_test-provider",
                price_type: "flat",
                type: {
                  label: "Test type",
                  description: "Test description",
                  code: "test-code",
                },
                prices: [
                  { currency_code: "usd", amount: 1000 },
                  { currency_code: "eur", amount: 1000 },
                ],
                rules: [
                  {
                    attribute: "enabled_in_store",
                    value: '"true"',
                    operator: "eq",
                  },
                  {
                    attribute: "is_return",
                    value: "false",
                    operator: "eq",
                  },
                ],
              },
              adminHeaders
            )
          ).data.shipping_option

          const regionWithoutTax = (
            await api.post(
              "/admin/regions",
              { name: "Italy", currency_code: "eur", countries: ["it"] },
              adminHeaders
            )
          ).data.region

          await api.post(
            `/store/carts/${cart.id}`,
            { region_id: regionWithoutTax.id },
            storeHeaders
          )

          await api.post(
            `/store/carts/${cart.id}/shipping-methods`,
            { option_id: shippingOption.id },
            storeHeaders
          )

          let updated = await api.post(
            `/store/carts/${cart.id}`,
            { region_id: region.id },
            storeHeaders
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              id: cart.id,
              shipping_methods: [],
            })
          )
        })

        it("should update email irregardless of registered customer", async () => {
          const updateEmailWithoutCustomer = await api.post(
            `/store/carts/${cart.id}`,
            { email: "tony@stark.com" },
            storeHeaders
          )

          expect(updateEmailWithoutCustomer.data.cart).toEqual(
            expect.objectContaining({
              email: "tony@stark.com",
              customer: expect.objectContaining({
                email: "tony@stark.com",
              }),
            })
          )

          const updateCartCustomer = await api.post(
            `/store/carts/${cart.id}/customer`,
            {},
            storeHeadersWithCustomer
          )

          expect(updateCartCustomer.data.cart).toEqual(
            expect.objectContaining({
              email: "tony@stark-industries.com",
              customer: expect.objectContaining({
                id: customer.id,
                email: "tony@stark-industries.com",
              }),
            })
          )

          const updateEmailWithCustomer = await api.post(
            `/store/carts/${cart.id}`,
            { email: "new@stark.com" },
            storeHeaders
          )

          expect(updateEmailWithCustomer.data.cart).toEqual(
            expect.objectContaining({
              email: "new@stark.com",
              customer: expect.objectContaining({
                id: customer.id,
                email: "tony@stark-industries.com",
              }),
            })
          )
        })
      })

      describe("POST /store/carts/:id/customer", () => {
        beforeEach(async () => {
          cart = (
            await api.post(
              `/store/carts`,
              {
                currency_code: "usd",
                sales_channel_id: salesChannel.id,
                region_id: region.id,
                items: [{ variant_id: product.variants[0].id, quantity: 1 }],
              },
              storeHeaders
            )
          ).data.cart
        })

        it("should throw 401 when user is not logged in as a customer", async () => {
          const { response } = await api
            .post(`/store/carts/${cart.id}/customer`, {}, storeHeaders)
            .catch((e) => e)

          expect(response.status).toEqual(401)
        })

        it("should throw error when cart does not exist", async () => {
          const { response } = await api
            .post(
              `/store/carts/does-not-exist/customer`,
              {},
              storeHeadersWithCustomer
            )
            .catch((e) => e)

          expect(response.status).toEqual(404)
          expect(response.data.message).toEqual(
            "Cart id not found: does-not-exist"
          )
        })

        it("should throw error when trying to update a cart that belongs to a customer that has an account", async () => {
          const customerUpdate1 = await api.post(
            `/store/carts/${cart.id}/customer`,
            {},
            storeHeadersWithCustomer
          )

          expect(customerUpdate1.status).toEqual(200)
          expect(customerUpdate1.data.cart).toEqual(
            expect.objectContaining({
              email: customer.email,
              customer: expect.objectContaining({
                id: customer.id,
                email: customer.email,
              }),
            })
          )

          const { jwt: jwt2 } = await createAuthenticatedCustomer(
            api,
            storeHeaders,
            {
              first_name: "tony2",
              last_name: "stark",
              email: "tony2@stark-industries.com",
            }
          )

          const storeHeadersWithCustomer2 = {
            headers: {
              ...storeHeaders.headers,
              authorization: `Bearer ${jwt2}`,
            },
          }

          const { response } = await api
            .post(
              `/store/carts/${cart.id}/customer`,
              {},
              storeHeadersWithCustomer2
            )
            .catch((e) => e)

          expect(response.status).toEqual(400)
          expect(response.data.message).toEqual(
            "Cannot update cart customer when its assigned to a different customer"
          )
        })

        it("should successfully update cart customer when cart is without customer", async () => {
          const updated = await api.post(
            `/store/carts/${cart.id}/customer`,
            {},
            storeHeadersWithCustomer
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              email: customer.email,
              customer: expect.objectContaining({
                id: customer.id,
                email: customer.email,
              }),
            })
          )
        })

        it("should successfully update cart customer when cart has a guest customer", async () => {
          const guestEmail = "tony@guest.com"
          const updatedCart = await api.post(
            `/store/carts/${cart.id}`,
            { email: guestEmail },
            storeHeadersWithCustomer
          )

          expect(updatedCart.status).toEqual(200)
          expect(updatedCart.data.cart).toEqual(
            expect.objectContaining({
              email: guestEmail,
              customer: expect.objectContaining({
                email: guestEmail,
              }),
            })
          )

          const updated = await api.post(
            `/store/carts/${cart.id}/customer`,
            {},
            storeHeadersWithCustomer
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              email: customer.email,
              customer: expect.objectContaining({
                id: customer.id,
                email: customer.email,
              }),
            })
          )
        })

        it("should successfully update cart customer when customer already owns the cart", async () => {
          const guestEmail = "tony@guest.com"

          await api.post(
            `/store/carts/${cart.id}/customer`,
            {},
            storeHeadersWithCustomer
          )

          const updatedCart = await api.post(
            `/store/carts/${cart.id}`,
            { email: guestEmail },
            storeHeadersWithCustomer
          )

          expect(updatedCart.status).toEqual(200)
          expect(updatedCart.data.cart).toEqual(
            expect.objectContaining({
              email: guestEmail,
              customer: expect.objectContaining({
                email: customer.email,
              }),
            })
          )

          const updated = await api.post(
            `/store/carts/${cart.id}/customer`,
            {},
            storeHeadersWithCustomer
          )

          expect(updated.status).toEqual(200)
          expect(updated.data.cart).toEqual(
            expect.objectContaining({
              email: guestEmail,
              customer: expect.objectContaining({
                id: customer.id,
                email: customer.email,
              }),
            })
          )
        })
      })
    })
  },
})