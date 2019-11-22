const { getRecords } = require("../lib/kinesis");
const notify = require("../lib/notify");
const retry = require("../lib/retry");
const Log = require("@dazn/lambda-powertools-logger");
const wrap = require("@dazn/lambda-powertools-pattern-basic");

module.exports.handler = wrap(async (event, context) => {
  const records = getRecords(event);
  const orderPlaced = records.filter(r => r.eventType === "order_placed");

  for (let order of orderPlaced) {
    try {
      await notify.restaurantOfOrder(order);
    } catch (err) {
      Log.debug(
        `failed to notify restaurant of order [${order.orderId}], queuing for retry...`
      );
      await retry.restaurantNotification(order);
    }
  }
});
