
const Redis = require("ioredis")

const KEYDB_INSTANCE = process.env.PROD_KEYDB_URL
const KEYDB_PASSWORD = process.env.PROD_KEYDB_PASSWORD

console.log(KEYDB_INSTANCE, KEYDB_PASSWORD)


const redisOptions = {
    port: 6379,
    host: KEYDB_INSTANCE,
    password: KEYDB_PASSWORD,
    // tls: {},
    db: 0,
    maxRetriesPerRequest: null
};

let redisClient;
let publisher
let subscriber

try {
    // redisClient = new Redis(redisOptions)
    publisher = new Redis(redisOptions);
    subscriber = new Redis(redisOptions);

} catch (e) {
    throw new Error(`Redis Connection Error :  ${e.message}`)
}

module.exports = { redisOptions, publisher, subscriber }

