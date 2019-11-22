const _ = require("lodash");
const AWSXRay = require("aws-xray-sdk-core");
const AWS = process.env.LAMBDA_RUNTIME_DIR
  ? AWSXRay.captureAWS(require("aws-sdk"))
  : require("aws-sdk");
const kinesis = new AWS.Kinesis();
const chance = require("chance").Chance();
const Log = require("@dazn/lambda-powertools-logger");
const wrap = require("@dazn/lambda-powertools-pattern-basic");

const streamName = process.env.order_events_stream;

const UNAUTHORIZED = {
  statusCode: 401,
  body: "unauthorized"
};

module.exports.handler = wrap(async (event, context) => {
  const restaurantName = JSON.parse(event.body).restaurantName;

  const userEmail = _.get(event, "requestContext.authorizer.claims.email");
  if (!userEmail) {
    Log.error("user email is not found");
    return UNAUTHORIZED;
  }

  const orderId = chance.guid();
  Log.debug(
    `placing order ID [${orderId}] to [${restaurantName}] for user [${userEmail}]`
  );

  const data = {
    orderId,
    userEmail,
    restaurantName,
    eventType: "order_placed"
  };

  const req = {
    Data: JSON.stringify(data), // the SDK would base64 encode this for us
    PartitionKey: orderId,
    StreamName: streamName
  };

  await kinesis.putRecord(req).promise();

  Log.debug(`published 'order_placed' event into Kinesis`);

  const response = {
    statusCode: 200,
    body: JSON.stringify({ orderId })
  };

  return response;
});
