// const kafkaConfig = require("../../config/kafka");
// const { Kafka, CompressionTypes } = require("kafkajs");

// class UpstashKafka {
//   constructor(config) {
//     this.kafka = new Kafka(config);
//   }

//   #createProducer() {
//     const producer = this.kafka.producer();
//     return producer;
//   }

//   #createConsumer(group_id) {
//     const consumer = this.kafka.consumer({
//       groupId: group_id,
//       sessionTimeout: 15,
//     });
//   }

//   async produceMessage(message, topic) {
//     const producer = await this.#createProducer();
//     producer.connect();

//     const newMessage = [];
//     producer.send({
//       topic,
//       message: newMessage, //[ { key : serverIdOfReceivingServer, value : "",  partition, }]
//       compression: CompressionTypes.GZIP,
//     });
//   }

//   async consumeMessage(topic, group_id) {
//     const consumer = this.#createConsumer(group_id);

//     await consumer.subscribe({ topics: [topic] });

//     return consumer;

//     await consumer.run({
//       eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
//         console.log({
//           key: message.key.toString(),
//           value: message.value.toString(),
//           headers: message.headers,
//         });

//         //Use RingPop
//       },
//     });
//   }
// }

// module.exports = new UpstashKafka(kafkaConfig);
