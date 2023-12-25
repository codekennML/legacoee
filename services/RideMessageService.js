const kafkaHandler  =  require ("./upstash/index")

class RideMessaging {

    constructor(client) {
      this.client =  client
    }
     

    async produceRideRequestResponse(ws, message) {
       const topic =  "ride_request_response"
       await this.client.produceMessage(message, topic)

    }   

    async consumeRideRequest() {
      
    }

}


kafkaHandler.on("message", )

module.exports  =  new RideMessaging(kafkaHandler)