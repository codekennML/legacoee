const kafkaHandler = require("./upstash/index");

class RideMessaging {
  constructor(client) {
    this.client = client;
  }

  async produceRideRequestResponse(message) {
    const topic = "ride_requests_response";
    await this.client.produceMessage(message, topic);
  }

  async consumeRideRequest(message) {
    const topic = "ride_request";
    await this.client.consumeMessage(message, topic);
  }
}

kafkaHandler.on("message");

module.exports = new RideMessaging(kafkaHandler);
