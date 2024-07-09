const z =  require("zod")

const driver_location_updates_schema = z.object({

location : z.object({
    lat : z.number(),
    lng : z.number()
}), 

prevLocation : z.object({
    lat : z.number(),
    lng : z.number()
}), 
 tripId : z.string(),
 topic : z.string(),
 availableSeats : z.number(),
 type : z.string()
})

const driver_negotiate_price_schema = z.object({
    tripId : z.string(),
    rideId  : z.string(),
    riderId : z.string(), 
    topic : z.string(),
    riderPushId : z.string(),
    type : z.string()
})

const driver_cancel_ride_schema = z.object({
    tripId : z.string(),
    rideId  : z.string(),
    topic : z.string(),
    type : z.string(),
    riderPushId : z.string(),
})

const driver_chat_message_schema = z.object({
    tripId : z.string(),
    rideId  : z.string(),
    driverId : z.string(),  
    sentAt : z.date() ,
    body : z.string(),
    topic : z.string(),
    type : z.string()
})

const driver_start_ride_schema = z.object({
    tripId : z.string(),
    rideId  : z.string(),
    riderId  : z.string(),
    chatId : z.string(),
    driverId : z.string(),   
    topic : z.string(),
    type : z.string(),
    riderPushId : z.string(),
})

const driver_arrived_schema = z.object({
    tripId : z.string(),
    rideId  : z.string(),
    driverId : z.string(),   
    topic : z.string(),
    type : z.string(),
    riderPushId : z.string(),
})

const driver_end_ride_schema = z.object({
    tripId : z.string(),
    rideId  : z.string(),
    topic : z.string(),
    type : z.string(),
    riderId  : z.string(),
    riderPushId : z.string(),
})

const driver_end_trip_schema = z.object({
    tripId : z.string(),
    driverId : z.string(),
    riderPushId : z.string(),
    location : z.object({
        lat : z.number(),
        lng : z.number()
    }), 
    
    prevLocation : z.object({
        lat : z.number(),
        lng : z.number()
    }), 
})



module.exports  = { 
driver_location_updates_schema,
driver_negotiate_price_schema,
driver_cancel_ride_schema,
driver_end_ride_schema, 
driver_arrived_schema,
driver_chat_message_schema,
driver_start_ride_schema,
driver_end_trip_schema
   
}
