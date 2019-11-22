const { expect } = require("chai");
const { init } = require("../steps/init");
const when = require("../steps/when");
const AWS = require("mock-aws");
const chance = require("chance").Chance();

// To verify that an email was received, we could subscribe a test email address to the SNS topic
// (or whitelist it in the case of SES).
// Then we can programmatically (e.g. Gmail has an API which we can use to read our emails)
// check our inbox and see if we had received the notification email.
// Here we'll take a short-cut and skip the test altogether.
if (process.env.TEST_MODE === "handler") {
  describe(`When we invoke the notify-restaurant function`, () => {
    let isEventPublished = false;
    let isNotified = false;

    before(async () => {
      await init();

      AWS.mock("Kinesis", "putRecord", req => {
        isEventPublished =
          req.StreamName === process.env.order_events_stream &&
          JSON.parse(req.Data).eventType === "restaurant_notified";

        return {
          promise: async () => {}
        };
      });

      AWS.mock("SNS", "publish", req => {
        isNotified =
          req.TopicArn === process.env.restaurant_notification_topic &&
          JSON.parse(req.Message).eventType === "order_placed";

        return {
          promise: async () => {}
        };
      });

      const event = {
        orderId: chance.guid(),
        userEmail: chance.email(),
        restaurantName: "Fangtasia",
        eventType: "order_placed"
      };
      await when.we_invoke_notify_restaurant(event);
    });

    after(() => {
      AWS.restore("Kinesis", "putRecord");
      AWS.restore("SNS", "publish");
    });

    if (process.env.TEST_MODE === "handler") {
      it(`Should publish message to SNS`, async () => {
        expect(isNotified).to.be.true;
      });

      it(`Should publish event to Kinesis`, async () => {
        expect(isEventPublished).to.be.true;
      });
    }
  });
}
