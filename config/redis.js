// const twemproxyConfig  =  {
//     port: 6379, // Twemproxy Redis port
//     host: "127.0.0.1", // Redis host
//     username: "default", // needs Redis >= 6
//     password: "my-top-secret",
//     db: 0, // Defaults to 0
//     enableOfflineQueue: false 
// }

const pubsubRedisConfig  =  {
    port: 6379, // Twemproxy Redis port
    host: "127.0.0.1", // Redis host
    username: "default", // needs Redis >= 6
    password: "my-top-secret",
    db: 0, // Defaults to 0
     enableOfflineQueue: false 
}
// Define the configuration for Twemproxy (nutcracker)
const twemproxyConfig = {
    sentinels: [
      { host: 'twemproxy-host', port: 26379 },
      // Add more sentinel configurations if needed
    ],
    name: 'mymaster', // The name of your Redis master server
  };
  
  // Create an instance of the Redis client with Twemproxy configuration
  const redis = new Redis({
    sentinels: twemproxyConfig.sentinels,
    name: twemproxyConfig.name,
  });

module.exports =  { 
    twemproxyConfig, 
    pubsubRedisConfig
}