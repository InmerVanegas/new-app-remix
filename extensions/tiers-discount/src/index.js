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
    const configuration = JSON.parse(
      input?.discountNode?.metafield?.value ?? "{}"
    );

    const discount_amount = { amount: "29.99" };

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
            fixedAmount: discount_amount
          }
        }
      ],
      discountApplicationStrategy: DiscountApplicationStrategy.First
    };
    /* return EMPTY_DISCOUNT; */
  };