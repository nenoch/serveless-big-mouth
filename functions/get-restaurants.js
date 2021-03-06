const AWSXRay = require("aws-xray-sdk-core");
const AWS = process.env.LAMBDA_RUNTIME_DIR
  ? AWSXRay.captureAWS(require("aws-sdk"))
  : require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const wrap = require("@dazn/lambda-powertools-pattern-basic");
const Log = require("@dazn/lambda-powertools-logger");

const defaultResults = process.env.defaultResults || 8;
const tableName = process.env.restaurants_table;

const getRestaurants = async count => {
  const req = {
    TableName: tableName,
    Limit: count
  };

  const resp = await dynamodb.scan(req).promise();
  return resp.Items;
};

module.exports.handler = wrap(async (event, context) => {
  Log.debug("loading restaurants");
  const restaurants = await getRestaurants(defaultResults);
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants)
  };

  return response;
});
