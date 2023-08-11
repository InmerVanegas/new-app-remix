// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").InputQuery} InputQuery
 * @typedef {import("../generated/api").FunctionResult} FunctionResult
 * @typedef {import("../generated/api").Target} Target
 * @typedef {import("../generated/api").ProductVariant} ProductVariant
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
    *   percentage: number
    *   vendors:string[]
    *   option:boolean
    *   optionQuantity:boolean
    *   minimumQuantity:number
    *   maximumQuantity:number
    *   subOptionQuantity:string
    *   optionDiscount:number
    * }}
    */
    const configuration = JSON.parse(
      input?.discountNode?.metafield?.value ?? "{}"
    );
    /* if (!configuration.quantity || !configuration.percentage) {
      return EMPTY_DISCOUNT;
    } */

    console.log(configuration.option);
    console.error(configuration.optionQuantity);
    const discount_amount = { amount: configuration.percentage };

    const discounts = [];
    const normalProducts = [];

    const targets = input.cart.lines
      .filter(line => {
        if (configuration.option) {
          if (configuration.optionQuantity) {
            if (configuration.subOptionQuantity === "minimum") {
              console.error("Selecciono lo minimo");
              return (
                line.quantity >= configuration.minimumQuantity &&
                line.merchandise.__typename === "ProductVariant" &&
                configuration.vendors.includes(line.merchandise.product.vendor)
              );
            } else if (configuration.subOptionQuantity === "maximum") {
              return (
                line.quantity <= configuration.maximumQuantity &&
                line.merchandise.__typename === "ProductVariant" &&
                configuration.vendors.includes(line.merchandise.product.vendor)
              )
            } else if (configuration.subOptionQuantity === "both") {
              console.error("Selecciono ambas");
              return (
                line.quantity >= configuration.minimumQuantity && line.quantity <= configuration.maximumQuantity &&
                line.merchandise.__typename === "ProductVariant" &&
                configuration.vendors.includes(line.merchandise.product.vendor)
              )
            }
          } else {
            return (
              line.merchandise.__typename === "ProductVariant" &&
              configuration.vendors.includes(line.merchandise.product.vendor)
            );
          }
        } else {
          if (configuration.optionQuantity) {
            if (configuration.subOptionQuantity === "minimum") {
              console.error("Selecciono lo minimo");
              return (
                line.quantity >= configuration.minimumQuantity &&
                line.merchandise.__typename === "ProductVariant" &&
                !configuration.vendors.includes(line.merchandise.product.vendor)
              );
            } else if (configuration.subOptionQuantity === "maximum") {
              return (
                line.quantity <= configuration.maximumQuantity &&
                line.merchandise.__typename === "ProductVariant" &&
                !configuration.vendors.includes(line.merchandise.product.vendor)
              )
            } else if (configuration.subOptionQuantity === "both") {
              console.error("Selecciono ambas");
              return (
                line.quantity >= configuration.minimumQuantity && line.quantity <= configuration.maximumQuantity &&
                line.merchandise.__typename === "ProductVariant" &&
                !configuration.vendors.includes(line.merchandise.product.vendor)
              )
            }
          } else {
            return (
              line.merchandise.__typename === "ProductVariant" &&
              !configuration.vendors.includes(line.merchandise.product.vendor)
            );
          }
        }

      })
      .map(line => {
        const variant = /** @type {ProductVariant} */ (line.merchandise);
        console.error(variant.product.vendor);
        return /** @type {Target} */ ({
          productVariant: {
            id: variant.id
          }
        });
      });

    if (!targets.length) {
      console.error("No cart lines qualify for volume discount.");
      return EMPTY_DISCOUNT;
    }

    if (configuration.optionDiscount === 0) {
      console.error("El descuento sera por porcentaje");
      return {
        discounts: [
          {
            targets,
            value: {
              percentage: {
                value: configuration.percentage.toString()
              }
            }
          }
        ],
        discountApplicationStrategy: DiscountApplicationStrategy.First
      };
    } else {
      console.error("El descuento sera por monto");
      return {
        discounts: [
          {
            targets,
            value: {
              fixedAmount: discount_amount
            }
          }
        ],
        discountApplicationStrategy: DiscountApplicationStrategy.First
      };
    }
    /* 
        return {
          discounts: [
            {
              targets,
              value: {
                percentage: {
                  value: configuration.percentage.toString()
                }
              }
            }
          ],
          discountApplicationStrategy: DiscountApplicationStrategy.First
        }; */
  };
