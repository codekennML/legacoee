const redisClient = require("ioredis");
const { pubsubRedisConfig, twemproxyConfig } = require("../../../config/redis");

const twemproxyRedis = new redisClient(twemproxyConfig);

const pubsubRedis = new redisClient(pubsubRedisConfig);

class redisClass {
  constructor(redisClient) {
    this.client = redisClient;
  }

  async subscribeToChannel(channelName) {
    const response = await this.redisClient.subscribe(channelName);
    return response;
  }

  async publishToChannel(channelName) {
    const response = await this.redisClient.publish(channelName);
  }
}

module.exports = {
  twemproxyRedis,
  pubsubRedis,
  redisClass,
};
