const { Types } = require("mongoose");
const  { app }  =  require("../../app");
const { redisOptions} = require("../config/redis/");
const Redis = require("ioredis")
const { errorLogger } = require("../middlewares/logger/winston");
const PolylineUtils =  require("../utils/mapUtils/index");
const ChatServiceLayer = require("./chatService");
const Route =  require("../controllers/route")
const { ROLES } = require ("../config/enums");
const MessageServiceLayer = require("./messageService");
const { rider_ride_request_schema, rider_accept_price_schema, rider_cancel_ride_schema, rider_chat_message_schema } = require("../middlewares/validators/riderSchema");
const { driver_location_updates_schema, driver_negotiate_price_schema, driver_cancel_ride_schema, driver_start_ride_schema } = require("../middlewares/validators/driverSchema");


const activeConnections = new Map();
const activeTopics =  new Map()

const retries = 0
const publisher =  new Redis(redisOptions);
const subscriber =  new Redis(redisOptions);

async function sendMessage (channel,  message,  retryCount = 0 , errMsg, topic,shouldClose = false) { 

  const response  =  { 
      topic : topic,
      success : true ,
      errMsg,
      shouldClose : shouldClose
    }

    await publisher.publish(channel, message, (err, numOfSubs) =>  {
    if(err){ 

  if(retries < retryCount){
    setTimeout(async() => { 
      await sendMessage(channel,  message , retryCount + 1 )
      retryCount++ 
    }, Math.pow(1.2, retryCount) * 1000)

  }  else {
    response.success = false
    errorLogger.error(errMsg)
  }

   
   }

   return response
    
   }
)
}

async function handleWebsocketMessages(ws, wsMessage ,  isBinary){

  
       const role = ws?.data?.role

       let response 
  
       let userType;
  
       if(role === ROLES.DRIVER) userType = "driver"
  
       if(role === ROLES.RIDER) userType = "rider" 

       userType = "driver"

      //  if(!role) {

      //   response =  { 
      //     success : false, 
      //     errorMsg : "Authorization error",
      //     shouldClose : true
      //   }
      //   errorLogger.error(`Websocket Auth error - No role found for user ${user} - `)

      //  }
  
              const { type, topic, ...rest} =  wsMessage 
           
  
              switch(true){ 

            
                case (userType === "driver") :   
                          
                      await subscriber.subscribe(rest.driverId, (err) => { 
                        if(err){
                       
                          console.log(error)
                          errorLogger.error(`{
                            title : "driver_location_redis_subscribe_error",
                            driverId : ${rest.driverId},
                            location : ${rest.location}
                            
                            }`)
                  
                           response  = {   
                           success : false ,
                              topic,
                              channel :rest.newParent,
                              shouldClose : true
                        }
                       }
                      }) 

                      const result  =    ws.subscribe(rest.driverId)

                      if(!result) {

                        response  = {   
                             success : false ,
                             topic, 
                             channel :rest.newParent,
                             shouldClose : true
                       }
                    }

                      if(type === "locationUpdates"){ 
                        
                        try{
                         driver_location_updates_schema.parse(wsMessage)
                         }
                         catch(e)
                         {
                           response = {  
                           success : false,
                           topic, 
                           shouldClose : false ,
                           type : "ZodError",
                           errMsg : e?.message
                        }
                        break
                         }

                        if(rest.availableSeats === 0 ) {
                            await subscriber.unsubscribe(rest.driverId, (err) => { 
                              if(err){
                                errorLogger.error(`{
                                  title : "driver_redis_unsubscribe_no_seats",
                                  driverId : ${ws.data.user}, 
                                  channel : ${rest.driverId}
                                  }`)
                          
                              
                              response  = {    
                                    success : false ,
                                    topic,
                                    channel :rest.newParent,
                                    shouldClose : true
                              }

                              return response
                             }
                            })
                        }
                          
                        //First check  if the prevCell is equal to the new cell Parent

                        const prevParentCell = await PolylineUtils.convertCoordinatesToH3CellId(rest?.prevLocation, 8) 
                        const newParentCell =  await PolylineUtils.convertCoordinatesToH3CellId(rest?.location , 8)

                        if(rest.availableSeats >  0  && (prevParentCell !== newParentCell || newParentCell )){
                            //Unsubscribe from the prev cell 
                            if(prevParentCell){
                                await  subscriber.unsubscribe(prevParentCell,  (err, count) =>{ 
                                      if(err){
                                        errorLogger.error(
                                          `{
                                          title : driver_prev_parent_cell_unsubscription_error,
                                           driver : ${ws.data.user}
                                           prevParentCell : ${prevParentCell}, 
                                           error : ${err}
                                          }`
                                          
                                        )

                                       response =  {
                                               success : false ,
                                             topic,
                                               channel :rest.prevParentCell,
                                               shouldClose : true
                                     
                                      }

                                      return response
                                       }
                                  })

                            }

                         
                          await subscriber.subscribe(newParentCell, (err, count) => { 
                                 if(err){
                                  errorLogger.error(
                               `{
                                          title : driver_new_parent_cell_subscription_error,
                                           driver : ${ws.data.user}
                                           parentCell : ${newParentCell}, 
                                           error : ${err}
                                          }`
                                  )
                       
                                response = {     
                                        success : false, 
                                        topic,
                                        channel :rest.newParent, 
                                        shouldClose : true
                                }

                                 }
                            })
                        }
    //For the guests who are monitoring their loved ones trips
                       await publisher.publish(rest.tripId,  JSON.stringify({
                        location : rest.location,
                        prevLocation : rest.prevLocation
                       }), (err) => { 
                        if(err){
                        errorLogger.error(
                             `{
                                          title : "driver_trip_location_publish_error",
                                           driver : "${ws.data.user}"
                                           channel : "${rest.tripId}", 
                                           error : "${err}"
                                          }`
                        )
                        response = 
                        {    
                                success : false, 
                                 topic,
                                channel :rest.newParent
                        }

                         }
                       })


                //encrypt the location and send back to the user mobile  
                // const { encryptedRouteArray, location, ...info }
                const info  =  { 
                  encryptedRouteArray : rest?.encryptedRouteArray ?? [], 
                  location : rest?.location
                }
  

                  try {
                    const  encryptedRiderRoute  =    await Route.encryptData(info) 

                    const token =  jwt.sign(encryptedRiderRoute.iv, process.env.ROUTE_SIGNING_KEY, {
                      expiresIn : "30m"
                      })  


                    response = {
                      success : true ,
                      type : "location_ping",
                      data : {
                        route : encryptedRiderRoute.encryptedData,
                        ix : token
                      }
                }
                  }catch (e){

                    response = {
                      success : false,
                      topic,
                      type : "location_ping",
                      data : encryptedRiderRoute,

                  }
                
                } 
    
                      }
              

              //This will be done on the FE
                       if(type ===  "rideRequest"){  
                        //First get the children of the ride request cellId on level 6, 
                        //Second get the drivers current cell on level 6 

                        
                        //Third, check if the driver cell is within a 5km radius of the riders current cell on cell 6,  if not , discard,  if yes, check the drivers destination 

                        //calculate if nearest point on the line of  riders destination coordinates to the drivers polyline is less than 3km ,  if yes , send make the driver receive the call 
                    

                    //data -  //  { budget : rest.budget, 
                    //  seats : rest.requestedSeats, 
                    //  location : rest.location, 
                    //  destination : rest.destination,
                    //  rideRequestId : rest.rideRequestId,
                    //  type :  "ride_request" }

                    //First we need to get the location to determine if this 


                       }

                       if(type === "negotiatePrice"){

                        try{
                          driver_negotiate_price_schema.parse(wsMessage)
                        }catch(e){
                        
                          response = {   
                            success : false,
                          topic, 
                          shouldClose : false ,
                          type : "ZodError",
                          errMsg : e?.message
                       }

                       break

                     }
                        
                         const { rideId } = rest 

                         response = await sendMessage(rideId, JSON.stringify({ 
                          price : rest.amount, 
                          tripId : rest.tripId, 
                          driverId : rest.driverId,
                          availableSeats : rest.availableSeats, 
                          type : "price_negotiated"
                       }), 2, `{
                          title : "driver_negotiate_price_error", 
                          driver : ${ws.data.user}, 
                          rider : ${rest.riderId}
                       }`, topic, false  )

                           response = {     
                                success : false ,
                                topic,
                                channel :rest.rideId
                           }
                         }
                       

                       if(type === "cancelRide"){
                      
                        try{
                          driver_cancel_ride_schema.parse(wsMessage)
                        }catch(e){
                        
                          response = {   
                          success : false,
                          topic, 
                          shouldClose : false ,
                          type : "ZodError",
                          errMsg : e?.message
                       }

                       break

                     }
                         
                     response =  await sendMessage(rest.rideId, JSON.stringify({
                      type : "ride_cancelled_driver", 
                      rideId : rest.rideId,
                      timestamp : new Date()
                     }), 2, `{ 
                     title : ride_cancelled_error
                     rideId : ${rest.rideId},
                     tripId : ${rest.tripId}

                     }`, topic, false)

                
                       }

                       if(type === "startRide"){

                        try{
                          driver_start_ride_schema.parse(wsMessage)
                        }catch(e){
                        
                          response = {   
                          success : false,
                          topic, 
                          shouldClose : false ,
                          type : "ZodError",
                          errMsg : e?.message
                       }

                       break

                     }

                        const { rideId, chatId } =  rest  

                        //End the chat  
                        let chatInfo 

                        try{
                            chatInfo = await ChatServiceLayer.updateChat({ 
                            docToUpdate : { _id : new Types.ObjectId(chatId)},
                            updateData : { $set : {  status : "completed"}},
                            options : { new : true, select : "_id" }
                            })
                        }catch(e){
                          response =  { 
                            success : false,
                            topic, 
                            shouldClose : false ,
                            type : "DB_Error",
                            errMsg : e?.message
                          }
                          break
                        }  

                       
      
                        if(!chatInfo){
      
                          errorLogger.error(`{
                            title :  driver_trip_chat_close_error, 
                            rider : ${rest.riderId}, 
                            driverId : ${ws.data.user}, 
                            chatId : ${chatInfo._id.toString()}
  
                            }`)
      
                          response =  {
                            success : false,
                            topic, 
                            shouldClose : false
                          }
                          break
                        }

                        response =  await sendMessage(rideId, JSON.stringify({ 
                          rideId : rest.rideId,
                          tripId :rest.tripId,
                          type : "ride_start"
                       }), 3, `{
                         title : driver_start_ride_error",
                         rideId : ${rest.rideId},
                         tripId : ${rest.tripId}


                       }`, topic, false)
                               }

                        if(type === "chatMessage") {


                          let chatMessage

                          try{

                            const message =      await MessageServiceLayer.createMessage({ 
                               chatId : new Types.ObjectId(rest.chatId), 
                               sentBy : ws.data.user,
                               body : rest.body  ,
                               sentAt : new Date(rest.sentAt)
                             }) 
                          
                             if(!message || message?.length === 0 ){
                              response =  { 
                                success : false,
                                topic, 
                                shouldClose : false ,
                                type : "DB_Error",
                                errMsg : e?.message
                              }
                              break
                            }
                          
                            chatMessage = message[0]
                          
                          }catch(e){
                            response =  { 
                              success : false,
                              topic, 
                              shouldClose : false ,
                              type : "DB_Error",
                              errMsg : e?.message
                            }
                            break
                          }
  
  
                          await sendMessage(rest.riderId, JSON.stringify({
                                            type : "chat_message", 
                                            body : rest.body, 
                                            chatId : chatMessage._id.toString(),
                                            sentAt : rest.sentAt 
                                           }), 3, `{ 
                                             title :   chat_message_error,
                                             riderId : ${rest.riderId}, 
                                             driverId : ${ws.data.user}
                                             sentAt : ${rest.sentAt}
                                        
                                           }`, topic,  false )
                          
                          }
                                    
                           




                                          
                          
                      

                      if(type === "driverArrived"){

                            const { rideId } =  rest  
    
                            await publisher.publish(rideId, JSON.stringify({ 
                               rideId : rest.rideId,
                               type : "driver_arrived"
                            }), (err, reply)=> {

                              if(err){

                                //  errorLogger.error(`Driver_arrived_error_${ws?.data?.user}`)
  

                                 ws.send(JSON.stringify({ 
                                  
                                     message : "Driver_arrived_error",
                                     channel :rest.rideId
                                 }))

                              }
                            })
    
    
                        }


                       if(type === "endRide"){

                         const { rideId } =  rest  

                         await publisher.publish(rideId, JSON.stringify({ 
                            rideId : rest.rideId,
                            amount : rest.rideFare,
                            type : "ride_end"
                         }), (err, reply)=> {
                            errorLogger.error(`Driver_ended_ride error_${ws?.data?.user}`)

                              response =  { 
                                message : "Driver_ended_price error",
                                channel :rest.rideId
                         }
                         })


                       }

                  
                 break
 

                case (userType === "rider"): 

                await subscriber.subscribe(rest.rideId, (err) => { 

                  if(err){
                    errorLogger.error(`{
                      title : "open_redis_subscription_channel_error", 
                      riderId : ${ws.data.user}
                      }`)
                    
                    response =  { 
                      success : false,  
                      topic, 
                      shouldClose : true
                    }

             
                  }
                })

                const riderSubscription =     ws.subscribe(rest.rideId)

                if(!riderSubscription) { 
                    errorLogger.error(`
                       {
                       title :  ws_subcription_error_${ws?.data?.user}, 
                       riderId : ${ws.data.user}, 
                       channel : ${rest.rideId}
                      }`
                     )

                    response =  { 
                      success : false,
                      errMsg : "ride_channel_subscription_error",        
                      shouldClose : true
                    }
              
                } 

         if(type === "rideRequest"){
                        //Subscribe to the ride request Id 
          //Check for surrounding ceslls up to 3km away and publish to those   cells

          try{
           rider_ride_request_schema.parse(wsMessage)
          }catch(e){
         response = {   success : false,
            topic, 
            shouldClose : false ,
            type : "ZodError",
            errMsg : e?.message
         }
         break
          }

       const surroundingCells = await PolylineUtils.getSurroundingCellsAtRadius(riderLocationCell, 3) //3km 
      

     if (surroundingCells.length > 0 ) {
      const message = JSON.stringify({ 
        budget : rest.budget, 
        seats : rest.requestedSeats, 
        location : rest.location, 
        destination : rest.destination,
        rideRequestId : rest.rideId,
        type :  "rideRequest"
   })

      for (const cell of surroundingCells) { 

        response =   await sendMessage(cell, message, 2, `
          {
                       title :   ride_request_redis_suscribe_error, 
                       riderId : ${ws.data.user}, 
                       channel : ${cell}
                      
         `, topic, false )
        
      }
      }
    }
               
         if(type === "acceptPrice"){

          try{
            rider_accept_price_schema.parse(wsMessage)
           }catch(e){
          response = {   success : false,
             topic, 
             shouldClose : false ,
             type : "ZodError",
             errMsg : e?.message
          }
          break
           }
                
                  //Create the chat here, 
 
                  const chat = await ChatServiceLayer.createChat({ 
                    users : [ws.data.user, rest.driverId], 
                    tripId : rest.tripId, 
                    rideId : rest.rideId,
                    status : "open"
                  })

                  if(!chat){

                    errorLogger.error(`{
                      title :  trip_chat_creation_error, 
                      driver : rest.driverId, 
                      riderId : ${ws.data.user}, 
                      chatId : ${chat[0]?._id.toString()}

                      }`)

                    response =  {
                      success : false,
                      topic, 
                      shouldClose : false
                    }
                    break
                  }
                    
                  response =  await sendMessage(rest.driverId,JSON.stringify({ 
                    type : "ride_chat" , 
                    chatId : chat[0]._id.toString(),
                    driverId : rest.driverId,
                    riderId : ws.data.user
                  }), 3, `{ 
                  title : "accept_driver_price_error", 
                  rider : ${ws.data.user}, 
                  driver : ${rest.driverId}, 

                  }`, topic, false )

                  //listen on the trip channel now for messages from the driverr,  where the driver sends broadcasts 

                  await subscriber.subscribe(rest.tripId, (err, subs) =>{
                   if (err) {
                    errorLogger.error(`{
                       title : trip_coordinates_redis_subscribe_error, 
                       driverId : ${rest.driverId}, 
                       riderId : ${ws.data.user}, 
                       channel : ${rest.driverId}
                      }`)
                    response =  { 
                      success : false, 
                      topic , 
                      shouldClose : false 
                    }
                   }
                  })

                  //Send push notification to the driver incase there is an error with the redis channel

         }
 
           
        if(type === "cancelRide"){
                //Unsubscribe from trip channel  

                try{
                  rider_cancel_ride_schema.parse(wsMessage)
                 }catch(e){
                response = {   success : false,
                   topic, 
                   shouldClose : false ,
                   type : "ZodError",
                   errMsg : e?.message
                }
                break
                 }
                
     
                 await subscriber.unsubscribe(rest.tripId, (err) => { 

                  if(err){
                    
                                      errorLogger.error(`{
                                        title : "cancel_ride_unsubscription_error", 
                                        riderId : ${ws.data.user}
                                        channel : ${rest.tripId}
                                        }`)
                                      
                                      response =  { 
                                        success : false,  
                                        topic, 
                                        shouldClose : true
                                      }

                                      return response

                  }
                })


                //SEND a cancel message 
              response  =  await sendMessage(rest.driverId, JSON.stringify({
                  type : "ride_cancelled_rider", 
                  rideId : rest.rideId,
                  timestamp : new Date()
              }), 3, `{ 
                title : "rider_cancel_ride_error", 
                riderId : ${ws.data.user}
              }`, topic, false)

               
           }
          

        if(type === "chatMessage"){ 

          try{
            //parse the message using the zod schema 
            rider_chat_message_schema.parse(wsMessage)
          }catch(e){
              response =  { 
                success : false,
                topic, 
                shouldClose : false ,
                type : "ZodError",
                errMsg : e?.message
              }
              break
          } 

          let chatMessage;

try{

  const message =      await MessageServiceLayer.createMessage({ 
     chatId : new Types.ObjectId(rest.chatId), 
     sentBy : ws.data.user,
     body : rest.body  ,
     sentAt : new Date(rest.sentAt)
   }) 

   if(!message || message?.length === 0 ){
    response =  { 
      success : false,
      topic, 
      shouldClose : false ,
      type : "DB_Error",
      errMsg : e?.message
    }
    break
  }

  chatMessage = message[0]

}catch(e){
  response =  { 
    success : false,
    topic, 
    shouldClose : false ,
    type : "DB_Error",
    errMsg : e?.message
  }
  break
}

      
                 await sendMessage(rest.driverId, JSON.stringify({
                  type : "chat_message", 
                  body : rest.body, 
                  chatId : chatMessage._id.toString(), 
                 }), 3, `{ 
                   title :   chat_message_sending,
                   driverId : ${rest.driverId}, 
                   riderId : ${ws.data.user}
              
                 }`, topic,  false )

                  }
           break
 
             

                default : 

                //  case (role === "guest") : 

                break 

      
    } 


    return response

  }


  
    


    module.exports = {
      activeConnections, 
      activeTopics, 
      handleWebsocketMessages
    }