// const redisClient = require("ioredis");
const { pubsubRedisConfig, twemproxyConfig } = require("../../../config/redis");

// const twemproxyRedis = new redisClient(twemproxyConfig);

// const pubsubRedis = new redisClient(pubsubRedisConfig);

class RedisClass {
  constructor(redisClient, config) {
    this.client = new redisClient(config);
  }

  async subscribeToChannel(channelName) {
    const response = await this.redisClient.subscribe(channelName);
    return response;
  }

  async publishToChannel(channelName) {
    const response = await this.redisClient.publish(channelName);
  }

  async appendDataFromList(listId) {}
}

const twemproxyRedis = new RedisClass(redisClient, twemproxyConfig);

const pubSubRedis = new RedisClass(redisClient, pubsubRedisConfig);

module.exports = {
  twemproxyRedis,
  pubSubRedis,
  RedisClass,
};
