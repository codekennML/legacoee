
const kafkaConfig  = {
    brokers: ['trusted-haddock-12480-eu1-kafka.upstash.io:9092'],
    sasl: {
      mechanism: 'scram-sha-256',
      username: 'dHJ1c3RlZC1oYWRkb2NrLTEyNDgwJKhtlAcYu0V6V02Qt3MVEg8jJVCxE3qmQzw',
      password: 'M2YyNDU3YjktMDlmMi00YTM0LTk0NWYtNDVkYTAyOGZjZmJj',
    },
    ssl: true,
  }


module.exports  =  kafkaConfig