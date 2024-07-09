const z =  require("zod")

const rider_ride_request_schema = z.object({
budget : z.number(),
requestedSeats : z.number(),
location : z.object({
    lat : z.number(),
    lng : z.number()
}), 
destination : z.object({
    lat : z.number(),
    lng : z.number()
}),
 rideId : z.string(),
 topic : z.string(),
 type : z.string()
})

const rider_accept_price_schema = z.object({
    tripId : z.string(),
    rideId  : z.string(),
    driverId : z.string(), 
    topic : z.string(),
    type : z.string(),
    driverPushId : z.string()
})

const rider_cancel_ride_schema = z.object({
    tripId : z.string(),
    rideId  : z.string(),
    driverId : z.string(), 
    topic : z.string(),
    type : z.string(),
    driverPushId : z.string()
})

const rider_chat_message_schema = z.object({
    tripId : z.string(),
    rideId  : z.string(),
    driverId : z.string(),   
    topic : z.string(),
    type : z.string(),
    driverPushId : z.string()
})


module.exports  = { 
    rider_ride_request_schema, 
    rider_accept_price_schema,
    rider_cancel_ride_schema,
    rider_chat_message_schema
}
