const MapService = require("./3rdParty/googlemaps/index")
const PolylineUtils = require('../utils/mapUtils/index');


class RedisDataProcessor {
    constructor() {
        this.dataHashArray = [];
        this.redisClient = new Redis(); // Assumes Redis server running on localhost:6379
        this.maxlengthThreshold = 799;
        this.lastPersistTime = Date.now()
    }

    async processData(message) {
        let response  = { success: true}
        // Process the incoming data and update the array
        this.dataHashArray.push(message);

        // Check if the hashmap length has reached the threshold for persistence
        if (this.shouldPersistData()) {
            const newDataArray  = this.dataHashArray
          response =     await this.persistAndRemoveProcessedData(newDataArray);

          return response
        }
    
        return response
        
    }

    shouldPersistData() {
        // Check if the hashmap length is over the threshold or if 2 seconds have elapsed
        return this.dataHashArray.length >= this.maxlengthThreshold || this.elapsedTime() >= 2000;
    }

    elapsedTime() {
        // Calculate the elapsed time since the last persistence
        return Date.now() - this.lastPersistTime;
    }

    async persistAndRemoveProcessedData(newData) {

        const newDataCount  = newData?.length

        if (newDataCount && newDataCount > 0) {

            const pipeline = this.redisClient.multi();  

            // Iterate over the hashmap and persist data to Redis
            this.dataHashArray.forEach((driverObject) => { 
                try {
                    pipeline.exists(driverObject.cellId, (err,  exists) => { 
                        if(!exists) pipeline.hset(driverObject.cellId,"drivers", JSON.stringify([]))
                    }) 
        
    
                    pipeline.hget(driverObject.cellId, "drivers", (err, result) => {

                        const driversArray =  JSON.parse(result || [] ) 
                    
                        driversArray.push(key)

                        pipeline.hset(key, "drivers", JSON.stringify(usersArray))
                    });

                 // Remove the processed entries from the hashmap
                  this.dataHashArray =  this.dataHashArray.splice(0, parseInt(newDataCount))
                    // Update the last persistence time
                    this.lastPersistTime = Date.now();

                    return { success: true}
                } catch (error) {
                    console.log("Something went wrong")
                  return { error : true  ,  msg : error?.message}
                }
              
            });
        
        }
    }
}



class DirectionsService {

    constructor() {

    }

    async getDirectionsData(lat, lng, place_id){
        
        const directionData =  await MapService.getDirections(lat, lng,place_id)

         const  {
             fare ,
             riderCurrentLocationData, 
             riderDestinationData,
             polylines,
             distance,
             duration,
             arrival_time,
             departure_time,
            
            } = directionData

            return directionData
    }



    async handleLocationData (ws,message ) {
        

    //Encode the coordinates to H3CellId
    const { coordinates, driverId, driverCarId, available_seats }   =  JSON.parse(message)
    const { lat , lng } =  coordinates 
    

    //Convert the location to H3 cell ID 
    const cellId =  await PolylineUtils.convertCoordinatesToH3CellId({ lat, lng})

  
    const driverData  =  {
            cellId,
            driverId,
            driverCarId,
            available_seats,   
            connected_to : process.env.APP_ID
        }
  
  try {
const response  =       await new RedisDataProcessor().processData(driverData)

console.log(response)
  } catch (err) {
    console.log("Something went wrong")
  }
    
    // return response
   

  }

    
}

module.exports  =  new DirectionsService()


