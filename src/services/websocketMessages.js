const { Types, trusted } = require("mongoose");
const { app } = require("../../app");
const { redisOptions } = require("../config/redis/");
const Redis = require("ioredis")
const { errorLogger } = require("../middlewares/logger/winston");
const PolylineUtils = require("../utils/mapUtils/index");
const ChatServiceLayer = require("./chatService");
const Route = require("../controllers/route")
const { ROLES } = require("../config/enums");
const MessageServiceLayer = require("./messageService");
const { rider_ride_request_schema, rider_accept_price_schema, rider_cancel_ride_schema, rider_chat_message_schema } = require("../middlewares/validators/riderSchema");
const { driver_location_updates_schema, driver_negotiate_price_schema, driver_cancel_ride_schema, driver_start_ride_schema, driver_arrived_schema, driver_end_ride_schema, driver_end_trip_schema, driver_chat_message_schema } = require("../middlewares/validators/driverSchema");
const { notificationFCM } = require("./3rdParty/google/firebase");
const { redisClient } = require("../config/redis/index")
const jwt = require("jsonwebtoken")

const activeConnections = new Map();
const activeDriverCellTopics = new Map() //This keeps track of the drivers in a cellid
// const activeRiderCellTopics =  new Map() //This tracks the 
const { publisher, subscriber } = require("../config/redis/index")







const sendPushWithBackoff = async (data, token, retryCount = 0) => {
  const maxRetries = 3;

  if (retryCount < maxRetries) {
    setTimeout(async () => {
      try {
        const response = await notificationFCM.send({
          token: token,
          data: data
        });
        console.log(response)
        if (response.failureCount > 0) {
          console.log('Failed to send message', response);
          throw new Error('Failed to send message');
        } else {
          console.log('Successfully sent message:', response);
        }
      } catch (e) {
        console.error('Error sending message:', e);
        sendPushWithBackoff(data, token, retryCount + 1);
      }
    }, Math.pow(3, retryCount) * 2000); // Using base 2 for exponential backoff
  } else {
    console.error('Max retry attempts reached. Failed to send message.');
  }
};
async function sendMessage(channel, message, retryCount, errMsg, topic, shouldClose = false) {

  const retries = 0

  const response = {
    topic: topic,
    success: true,
    shouldClose: shouldClose
  }

  await publisher.publish(channel, message, async (err, numOfSubs) => {
    if (err) {

      if (retries < retryCount) {
        setTimeout(async () => {
          await sendMessage(channel, message, retryCount + 1)
          retryCount++
        }, Math.pow(1.2, retryCount) * 1000)

      } else {
        console.log("lmao")
        const messageJSON = JSON.parse(message)
        const { riderPushId, driverPushId, ...rest } = messageJSON
        const pushId = riderPushId ? riderPushId : driverPushId

        try {

          await sendPushWithBackoff(rest, pushId)

          return response

        } catch (e) {

          response.success = false
          errorLogger.error(errMsg)
        }

        return response

      }


    }

    return response

  }
  )

  return response
}

async function handleWebsocketMessages(ws, wsMessage
  , isBinary, limitedDriverObject) {


  const role = ws?.data?.role

  let response = {
    succes: true,
    shouldClose: false,
    topic: wsMessage.topic
  }

  let userType;

  if (role === ROLES.DRIVER) userType = "driver"

  if (role === ROLES.RIDER) userType = "rider"


  if (!role) {

    response = {
      success: false,
      errorMsg: "Authorization error",
      shouldClose: true
    }
    errorLogger.error(`Websocket Auth error - No role found for user ${user} - `)

  }

  const { type, topic, ...rest } = wsMessage


  switch (true) {


    case (userType === "driver"):

      // await subscriber.subscribe(ws.data.user, (err) => { 
      //   if(err){

      //     console.log(err)
      //     errorLogger.error(`{
      //       title : "driver_location_redis_subscribe_error",
      //       driverId : ${rest.driverId},
      //       location : ${rest.location}

      //       }`)

      //      response  = {   
      //      success : false ,
      //         topic,
      //         channel :rest.newParent,
      //         shouldClose : true
      //   }
      //  }
      // }) 

      const result = ws.subscribe(ws.data.user)

      if (!result) {

        response = {
          success: false,
          topic,
          channel: rest.newParent,
          shouldClose: true
        }
      }

      const prevParentCell = await PolylineUtils.convertCoordinatesToH3CellId(rest?.prevLocation, 6)
      const newParentCell = await PolylineUtils.convertCoordinatesToH3CellId(rest?.location, 6)


      if (type === "locationUpdates") {

        try {
          driver_location_updates_schema.parse(wsMessage)
        }
        catch (e) {
          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }
          break
        }
        //Is there even a seat left for others to join


        if (rest.availableSeats === 0) {
          //Remove the driver from the list of drivers in the prev cell
          const driversInCellCount = limitedDriverObject.get(prevParentCell)
          if (driversInCellCount && Object.values(driversInCellCount).length > 1) {
            delete limitedDriverObject[rest.prevParentCell][ws.data.user]
          } else {

            delete limitedDriverObject[prevParentCell][ws.data.user]
            await subscriber.unsubscribe(rest.driverId, (err) => {
              if (err) {
                errorLogger.error(`{
                                  title : "driver_redis_unsubscribe_no_seats",
                                  driverId : ${ws.data.user}, 
                                  channel : ${rest.driverId}
                                  }`)


                response = {
                  success: false,
                  topic,
                  channel: rest.newParent,
                  shouldClose: true
                }

                return response
              }
            })
          }

        }
        //First check  if the prevCell is equal to the new cell Parent



        if (rest.availableSeats > 0 && (prevParentCell !== newParentCell || newParentCell)) {
          //remove the driver from the list of drivers in the prev cell


          if (prevParentCell) {

            const hasPrevCell = limitedDriverObject.get([prevParentCell], [ws.data.user])

            if (hasPrevCell) (limitedDriverObject.delete([prevParentCell], [ws.data.user]))

            if (limitedDriverObject.countKeys(prevParentCell) === 0) {
              //unsubscribe from this cell in redis
              await subscriber.unsubscribe(newParentCell, (err, count) => {
                if (err) {
                  errorLogger.error(
                    `{
                                   title : redis_prev_parent_cell_unsubscription_error,
                                    driver : ${ws.data.user}
                                    parentCell : ${prevParentCell}, 
                                    error : ${err}
                                   }`
                  )


                  response = {
                    success: false,
                    topic,
                    channel: rest.newParent,
                    shouldClose: true
                  }

                }
              })
              break
            }

          }

          const driversInNewParentCell = limitedDriverObject.get(newParentCell)
          console.log(driversInNewParentCell, newParentCell)

          if (!driversInNewParentCell) {
            //Subscribe to this cell in redis , this will be the only redis subscription app wide for this cell , not per driver
            await subscriber.subscribe(newParentCell, (err, count) => {
              if (err) {
                errorLogger.error(
                  `{
                                            title : driver_new_parent_cell_subscription_error,
                                             driver : ${ws.data.user}
                                             parentCell : ${newParentCell}, 
                                             error : ${err}
                                            }`
                )

                limitedDriverObject.delete([prevParentCell], [ws.data.user])

                response = {
                  success: false,
                  topic,
                  channel: rest.newParent,
                  shouldClose: true
                }

              }
            })
          }
          console.log(rest.destination, "dest")
          ws.destination = rest?.destination

          console.log(ws)
          limitedDriverObject.set(newParentCell, ws.data.user, ws)
          //Update this user location within their connection so we can grab it on close and exit from the channel

          if (prevParentCell !== newParentCell) {
            ws.data = { ...ws.data, currentCell: newParentCell }
            activeConnections.set(ws.data.user, ws)
          }


        }
        console.log(rest.tripId, limitedDriverObject.count(), "sui")
        //For the guests who are monitoring their loved ones trips
        await publisher.publish(rest.tripId, JSON.stringify({
          location: rest.location,
          prevLocation: rest.prevLocation
        }), (err) => {
          if (err) {
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
              success: false,
              topic,
              channel: rest.newParent
            }

          }
        })


        //encrypt the location and send back to the user mobile  
        // const { encryptedRouteArray, location, ...info }
        const info = {
          encryptedRouteArray: rest?.encryptedRouteArray ?? [],
          location: rest?.location
        }

        try {
          const encryptedDriverRoute = await Route.encryptData(info)

          const token = jwt.sign({ key: encryptedDriverRoute.iv }, process.env.ROUTE_SIGNING_KEY, {
            expiresIn: "7d"
          })

          response = {
            success: true,
            type: "location_ping",
            data: {
              route: encryptedDriverRoute.encryptedData,
              ix: token
            }
          }
        } catch (e) {

          response = {
            success: false,
            topic,
            type: "location_ping",
            // data : encryptedRiderRoute,

          }

        }

      }


      // //This will be done on the FE
      //        if(type ===  "rideRequest"){  
      //         //First get the children of the ride request cellId on level 6, 
      //         //Second get the drivers current cell on level 6 


      //         //Third, check if the driver cell is within a 5km radius of the riders current cell on cell 6,  if not , discard,  if yes, check the drivers destination 

      //         //calculate if nearest point on the line of  riders destination coordinates to the drivers polyline is less than 3km ,  if yes , send make the driver receive the call 


      //     //data -  //  { budget : rest.budget, 
      //     //  seats : rest.requestedSeats, 
      //     //  location : rest.location, 
      //     //  destination : rest.destination,
      //     //  rideRequestId : rest.rideRequestId,
      //     //  type :  "ride_request" }

      //     //First we need to get the location to determine if this 


      //        }

      if (type === "negotiatePrice") {

        try {
          driver_negotiate_price_schema.parse(wsMessage)
        } catch (e) {

          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }

          break

        }

        const { riderId } = rest



        response = await sendMessage(riderId, JSON.stringify({
          amount: rest.amount,
          rideId: rest.rideId,
          tripId: rest.tripId,
          driverId: rest.driverId,
          availableSeats: rest.availableSeats,
          type: "price_negotiated",
          riderPushId: rest.riderPushId
        }), 2, `{
                          title : "driver_negotiate_price_error", 
                          driver : ${ws.data.user}, 
                          rider : ${rest.riderId}
                       }`, topic, false)

        response = {
          success: false,
          topic,
          channel: rest.riderId
        }
      }


      if (type === "cancelRide") {

        try {
          driver_cancel_ride_schema.parse(wsMessage)
        } catch (e) {

          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }

          break

        }
        response = await sendMessage(rest.riderId, JSON.stringify({
          type: "ride_cancelled_driver",
          tripId: rest.tripId,
          rideId: rest.rideId,
          timestamp: new Date(),
          riderPushId: rest.riderPushId
        }), 2, `{ 
                     title : ride_cancelled_error
                     rideId : ${rest.rideId},
                     tripId : ${rest.tripId}

                     }`, topic, false)


      }

      if (type === "startRide") {

        try {
          driver_start_ride_schema.parse(wsMessage)
        } catch (e) {

          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }

          break

        }

        const { riderId, chatId } = rest

        //End the chat  
        let chatInfo

        try {
          chatInfo = await ChatServiceLayer.updateChat({
            docToUpdate: { _id: new Types.ObjectId(chatId) },
            updateData: { $set: { status: "completed" } },
            options: { new: true, select: "_id" }
          })
        } catch (e) {

          errorLogger.error(`{
            title :  DB_Error, 
            message : ${e.message},
            user : ${ws.data.user}
            }`)
          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "DB_Error",
            errMsg: "An unexpected error has occurred."
          }
          break
        }

        if (!chatInfo) {

          errorLogger.error(`{
                            title :  driver_trip_chat_ride_start_error, 
                            rider : ${rest.riderId}, 
                            driverId : ${ws.data.user}, 
                            chatId : ${chatId}
  
                            }`)

          response = {
            success: false,
            topic,
            shouldClose: false
          }
          break
        }

        response = await sendMessage(riderId, JSON.stringify({
          rideId: rest.rideId,
          tripId: rest.tripId,
          type: "ride_start",
          riderPushId: rest.riderPushId
        }), 3, `{
                         title : driver_start_ride_error",
                         rideId : ${rest.rideId},
                         tripId : ${rest.tripId}


                       }`, topic, false)
      }

      if (type === "chatMessage") {

        console.log(rest)

        try {
          driver_chat_message_schema.parse(wsMessage)
        } catch (e) {

          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }

          break

        }

        let chatMessage



        try {

          const message = await MessageServiceLayer.createMessage({
            chatId: new Types.ObjectId(rest.chatId),
            sentBy: ws.data.user,
            body: rest.body,
            sentAt: new Date(rest.sentAt)
          })

          if (!message || message?.length === 0) {


            errorLogger.error(`{
            title :  DB_Error_Create_Chat_Message, 
            message : ${e.message},
            user : ${ws.data.user}
            }`)

            response = {
              success: false,
              topic,
              shouldClose: false,
              type: "DB_Error",
              errMsg: "An unexpected error has occurred."
            }
            break
          }

          chatMessage = message[0]

        } catch (e) {
          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "DB_Error",
            errMsg: "Unexpected error occurred."
          }
          break
        }


        response = await sendMessage(rest.riderId, JSON.stringify({
          type: "chat_message",
          body: rest.body,
          riderId: rest.riderId,
          driverId: ws.data.user,
          chatId: chatMessage._id.toString(),
          sentAt: rest.sentAt
        }), 3, `{ 
                                             title :   chat_message_error,
                                             riderId : ${rest.riderId}, 
                                             driverId : ${ws.data.user}
                                             sentAt : ${rest.sentAt}
                                        
                                           }`, topic, false)

      }

      if (type === "driverArrived") {

        try {
          driver_arrived_schema.parse(wsMessage)
        } catch (e) {
          errorLogger.error(`{
            title :  DB_Error_Driver_Arrived_Message, 
            message : ${e.message},
            user : ${ws.data.user}
            }`)

          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: "An unexpected error has occurred."
          }

          break

        }



        const { riderId } = rest

        response = await sendMessage(riderId, JSON.stringify({
          rideId: rest.rideId,
          tripId: rest.tripId,
          riderId,
          type: "driver_arrived",
          riderPushId: rest.riderPushId
        }), 2, `{
                           title : driver_arrived_publish_error, 
                           driverId : ${ws.data.user}, 
                           tripId : ${rest.tripId}, 
                           riderId : ${rest.riderId}, 
                           rideId : ${rest.rideId}
                           
                           }`)

      }


      if (type === "endRide") {

        try {
          driver_end_ride_schema.parse(wsMessage)
        } catch (e) {

          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }

          break

        }

        const { riderId } = rest

        response = await sendMessage(riderId,
          JSON.stringify({
            rideId: rest.rideId,
            amount: rest.rideFare,
            type: "ride_end",
            tripId: rest.tripId,
            riderPushId: rest.riderPushId,

          }), 3, `{
                         title : end_ride_error
                         rideId : ${rest.rideId}, 
                         tripId: ${rest.rideId}, 
                         driverId : ${ws.data.user},

                         }`, topic, false
        )



      }

      if (type === "endTrip") {


        try {
          driver_end_trip_schema.parse(wsMessage)
        } catch (e) {

          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }

          break

        }

        //unsubscribe from the channel  

        const currentCell = await PolylineUtils.convertCoordinatesToH3CellId(rest.location, 7)
        const prevCell = await PolylineUtils.convertCoordinatesToH3CellId(rest.prevLocation, 7)

        console.log(currentCell, prevCell)

        //remove the driver from the last cell they were in 
        limitedDriverObject.delete([prevParentCell], [ws.data.user])
        limitedDriverObject.delete([currentCell], [ws.data.user])

        await subscriber.unsubscribe(rest.driverId, currentCell, prevCell, (err, count) => {
          errorLogger.info(`Error ending driver ${rest.driverId} subscriptions for ended trip`)

          response = {
            success: false,
            topic,
            shouldClose: true
          }
        })

        response = {
          success: true,
          shouldClose: true
        }

      }


      break


    case (userType === "rider"):

      let subscriberError = false
      console.log(ws.data.user, "this is the rider")
      await subscriber.subscribe(ws.data.user, (err) => {

        if (err) {
          errorLogger.error(`{
                      title : "open_redis_subscription_channel_error", 
                      riderId : ${ws.data.user}
                      }`)

          response = {
            success: false,
            topic,
            shouldClose: true
          }
          subscriberError = true

        }
      })

      if (subscriberError) break

      const riderSubscription = ws.subscribe(ws.data.user)

      if (!riderSubscription) {
        errorLogger.error(`
                       {
                       title :  ws_subcription_error_${ws?.data?.user}, 
                       riderId : ${ws.data.user}, 
                       channel : ${rest.rideId}
                      }`
        )

        response = {
          success: false,
          errMsg: "ride_channel_subscription_error",
          shouldClose: true
        }

        break

      }

      if (type === "rideRequest") {
        //Subscribe to the ride request Id 
        //Check for surrounding ceslls up to 3km away and publish to those   cells

        try {
          rider_ride_request_schema.parse(wsMessage)
        } catch (e) {
          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }
          break
        }

        const riderLocationCell = await PolylineUtils.convertCoordinatesToH3CellId(rest.location, 6)

        const surroundingCells = new Set(await PolylineUtils.getSurroundingCellsAtRadius(riderLocationCell, 1)) //3km 

        console.log(response)
        console.log(riderLocationCell, surroundingCells.length, surroundingCells)

        if (surroundingCells.size > 0) {
          const message = JSON.stringify({
            budget: rest.budget,
            seats: rest.requestedSeats,
            location: rest.location,
            destination: rest.destination,
            rideRequestId: rest.rideId,
            type: "rideRequest",
            driverCellId: rest.driverPushId
          })

          for (const cell of surroundingCells) {

            response = await sendMessage(cell, message, 2, `
          {
                       title :   ride_request_redis_suscribe_error, 
                       riderId : ${ws.data.user}, 
                       channel : ${cell}
                      
         `, topic, false)

          }
        }
        console.log(response)
        break
      }

      if (type === "acceptPrice") {

        try {
          rider_accept_price_schema.parse(wsMessage)
        } catch (e) {
          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }
          break
        }

        //Create the chat here, 

        const chat = await ChatServiceLayer.createChat({
          users: [ws.data.user, rest.driverId],
          tripId: rest.tripId,
          rideId: rest.rideId,
          status: "open"
        })

        if (!chat) {

          errorLogger.error(`{
                      title :  trip_chat_creation_error, 
                      driver : rest.driverId, 
                      riderId : ${ws.data.user}, 
                      chatId : ${chat[0]?._id.toString()}

                      }`)

          response = {
            success: false,
            topic,
            shouldClose: false
          }
          break
        }

        response = await sendMessage(rest.driverId, JSON.stringify({
          type: "ride_chat",
          chatId: chat[0]._id.toString(),
          driverId: rest.driverId,
          riderId: ws.data.user,
          driverPushId: rest.driverPushId
        }), 3, `{ 
                  title : "accept_driver_price_error", 
                  rider : ${ws.data.user}, 
                  driver : ${rest.driverId}, 

                  }`, topic, false)

        //listen on the trip channel now for messages from the driverr,  where the driver sends broadcasts 

        await subscriber.subscribe(rest.driverId, (err, subs) => {
          if (err) {
            errorLogger.error(`{
                       title : trip_coordinates_redis_subscribe_error, 
                       driverId : ${rest.driverId}, 
                       riderId : ${ws.data.user}, 
                       channel : ${rest.driverId}
                      }`)
            response = {
              success: false,
              topic,
              shouldClose: false
            }
          }
        })

        //Send push notification to the driver incase there is an error with the redis channel

      }


      if (type === "cancelRide") {
        //Unsubscribe from trip channel  

        try {
          rider_cancel_ride_schema.parse(wsMessage)
        } catch (e) {
          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }
          break
        }


        await subscriber.unsubscribe(rest.driverId, (err) => {

          if (err) {

            errorLogger.error(`{
                                        title : "cancel_ride_unsubscription_error", 
                                        riderId : ${ws.data.user}
                                        channel : ${rest.tripId}
                                        }`)

            response = {
              success: false,
              topic,
              shouldClose: true
            }

            return response

          }
        })


        //SEND a cancel message 
        response = await sendMessage(rest.driverId, JSON.stringify({
          type: "ride_cancelled_rider",
          rideId: rest.rideId,
          timestamp: new Date(),
          driverPushId: rest.driverPushId
        }), 3, `{ 
                title : "rider_cancel_ride_error", 
                riderId : ${ws.data.user}
              }`, topic, false)


      }


      if (type === "chatMessage") {

        try {
          //parse the message using the zod schema 
          rider_chat_message_schema.parse(wsMessage)
        } catch (e) {
          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "ZodError",
            errMsg: e?.message
          }
          break
        }

        let chatMessage;

        try {

          const message = await MessageServiceLayer.createMessage({
            chatId: new Types.ObjectId(rest.chatId),
            sentBy: ws.data.user,
            body: rest.body,
            sentAt: new Date(rest.sentAt)
          })

          if (!message || message?.length === 0) {
            response = {
              success: false,
              topic,
              shouldClose: false,
              type: "DB_Error",
              errMsg: e?.message
            }
            break
          }

          chatMessage = message[0]

        } catch (e) {
          response = {
            success: false,
            topic,
            shouldClose: false,
            type: "DB_Error",
            errMsg: e?.message
          }
          break
        }


        await sendMessage(rest.driverId, JSON.stringify({
          type: "chat_message",
          body: rest.body,
          chatId: chatMessage._id.toString(),
          sentAt: rest.sentAt,
          driverPushId: rest.driverPushId
        }), 3, `{ 
                   title :   chat_message_sending,
                   driverId : ${rest.driverId}, 
                   riderId : ${ws.data.user}
              
                 }`, topic, false)

      }
      break



    default:

      //  case (role === "guest") : 

      break


  }


  return response

}







module.exports = {
  activeConnections,
  activeDriverCellTopics,
  handleWebsocketMessages
}