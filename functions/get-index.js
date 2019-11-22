const fs = require("fs");
const Mustache = require("mustache");
const AWSXRay = require("aws-xray-sdk-core");
const https = process.env.LAMBDA_RUNTIME_DIR
  ? AWSXRay.captureHTTPs(require("https"))
  : require("https");
const aws4 = require("aws4");
const URL = require("url");
const Log = require("@dazn/lambda-powertools-logger");
const wrap = require("@dazn/lambda-powertools-pattern-basic");
const CorrelationIds = require("@dazn/lambda-powertools-correlation-ids");

const restaurantsApiRoot = process.env.restaurants_api;
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
const ordersApiRoot = process.env.orders_api;
const awsRegion = process.env.AWS_REGION;
const cognitoUserPoolId = process.env.cognito_user_pool_id;
const cognitoClientId = process.env.cognito_client_id;
let html;
function loadHtml() {
  if (!html) {
    Log.info("loading index.html...");
    html = fs.readFileSync("static/index.html", "utf-8");
    Log.info("loaded");
  }
  return html;
}

const getRestaurants = () => {
  const url = URL.parse(restaurantsApiRoot);
  const opts = {
    host: url.hostname,
    path: url.pathname
  };

  aws4.sign(opts);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "GET",
      headers: Object.assign({}, opts.headers, CorrelationIds.get())
    };

    const req = https.request(options, res => {
      res.on("data", buffer => {
        const body = buffer.toString("utf8");
        resolve(JSON.parse(body));
      });
    });

    req.on("error", err => reject(err));

    req.end();
  });
};

module.exports.handler = wrap(async (event, context) => {
  const template = loadHtml();
  const restaurants = await getRestaurants();
  const dayOfWeek = days[new Date().getDay()];
  const view = {
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`,
    placeOrderUrl: `${ordersApiRoot}`
  };
  const html = Mustache.render(template, view);
  const response = {
    statusCode: 200,
    headers: {
      "content-type": "text/html; charset=UTF-8"
    },
    body: html
  };
  return response;
});
