// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").InputQuery} InputQuery
 * @typedef {import("../generated/api").FunctionResult} FunctionResult
 */

/**
 * @type {FunctionResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

export default /**
 * @param {InputQuery} input
 * @returns {FunctionResult}
 */
  (input) => {

    /**
    * @type {{
    * tiersDiscount:number[]
    * percentagesDiscount:number[]
    * }}
     */

    const configuration = JSON.parse(
      input?.discountNode?.metafield?.value ?? "{}"
    );

    if (!input.cart.buyerIdentity?.customer?.allowDiscount) {
      return EMPTY_DISCOUNT;
    }

    const subtotal = parseFloat(input?.cart?.cost?.subtotalAmount?.amount ?? "0");

    let applicableTier = null;
    let applicableDiscount = null;

    for (let i = 0; i < configuration.tiersDiscount.length; i++) {
      if (configuration.tiersDiscount[i] <= subtotal) {
        applicableTier = configuration.tiersDiscount[i];
        applicableDiscount = configuration.percentagesDiscount[i];
      }
    }

    return {
      discounts: [
        {
          targets: [{
            orderSubtotal: {
              excludedVariantIds: []
            }
          }],
          message: "Test Discount",
          value: {
            percentage: {
              value: applicableDiscount?.toString()
            }
          }
        }
      ],
      discountApplicationStrategy: DiscountApplicationStrategy.First
    };
  };