const _ = require("lodash");
const { promisify } = require("util");
const awscred = require("awscred");
const { REGION, STAGE } = process.env;
const AWS = require("aws-sdk");
AWS.config.region = REGION;
const SSM = new AWS.SSM();

let initialized = false;

const getParameters = async keys => {
  const prefix = `/workshop-icanuti/${STAGE}/`;
  const req = {
    Names: keys.map(key => `${prefix}${key}`)
  };
  const resp = await SSM.getParameters(req).promise();
  return _.reduce(
    resp.Parameters,
    function(obj, param) {
      obj[param.Name.substr(prefix.length)] = param.Value;
      return obj;
    },
    {}
  );
};

const init = async () => {
  if (initialized) {
    return;
  }

  const params = await getParameters([
    "restaurant_topic_name",
    "stream_name",
    "table_name",
    "cognito_user_pool_id",
    "cognito_web_client_id",
    "cognito_server_client_id",
    "url"
  ]);

  console.log("SSM params loaded");

  process.env.AWS_XRAY_CONTEXT_MISSING = "LOG_ERROR";
  process.env.TEST_ROOT = params.url;
  process.env.failure_rate = 0;
  process.env.restaurants_api = `${params.url}/restaurants`;
  process.env.restaurants_table = params.table_name;
  process.env.order_events_stream = params.stream_name;
  process.env.restaurant_notification_topic = params.restaurant_topic_name;
  process.env.AWS_REGION = REGION;
  process.env.cognito_user_pool_id = params.cognito_user_pool_id;
  process.env.cognito_client_id = params.cognito_web_client_id;
  process.env.cognito_server_client_id = params.cognito_server_client_id;

  const { credentials } = await promisify(awscred.load)();

  process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;

  if (credentials.sessionToken) {
    process.env.AWS_SESSION_TOKEN = credentials.sessionToken;
  }

  console.log("AWS credential loaded");

  initialized = true;
};

module.exports = {
  init
};
