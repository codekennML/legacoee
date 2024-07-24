require("dotenv").config();
const closeWithGrace = require("close-with-grace")
const { app, uWS, port } = require("./app")
const { driverRoutes, baseRoutes } = require("./src/routes/base");
const { chatSchema,
  deleteChatSchema,
  getChatByIdSchema,
  getChatByRideIdSchema,
  endChatSchema,
  getChatSchema } = require("./src/routes/schemas/chats")
const { getMessagesSchema, messageSchema, deleteMessagesSchema } = require("./src/routes/schemas/messages")
const { responseHandler, readJSON } = require("./responsehandler");
const { logger } = require("./src/middlewares/logger/events");
const { durationStart } = require("./src/middlewares/logger/requests");
const tryCatch = require("./src/utils/helpers/tryCatch");
const chatController = require("./src/controllers/chats")
const messageController = require("./src/controllers/message");
const { errorLogger } = require("./src/middlewares/logger/winston");

const { AuthGuard } = require("./src/middlewares/auth/verifyAccessToken")
const { verifyPermissions } = require("./src/middlewares/auth/permissionGuard")
const validateRequest = require("./src/middlewares/validators/index")
const { ROLES } = require("./src/config/enums");
const AppError = require("./src/middlewares/errors/BaseError");
const { handleWebsocketMessages, activeConnections, activeTopics } = require("./src/services/websocketMessages");
const { getReasonPhrase, StatusCodes } = require("http-status-codes");
const { subscriber } = require("./src/config/redis/index")
const PolylineUtils = require("./src/utils/mapUtils/index");
const startDB = require("./src/config/connectDB");


startDB()

class LimitedSizeObject {
  constructor(limit = 2000) {
    this.data = {};
    this.limit = limit;
  }

  set(key, propertyKey, value) {
    if (!this.data[key]) {
      this.data[key] = {};
    }

    const propertyKeys = Object.keys(this.data[key]);
    if (propertyKeys.length >= this.limit) {
      // Remove the oldest property
      delete this.data[key][propertyKeys[0]];
    }

    this.data[key][propertyKey] = value;
  }

  get(key, subKey) {

    if (key && !subKey) {

      return this.data[key] || null
    }
    else {
      return this.data[key][subKey] || null
    }

  }

  delete(key, subKey) {

    let response = null

    if (key && !subKey) {
      const value = this.get(key)
      if (value) delete this.data[key]
      response = "ok"

    }
    else {
      const value = this.get(key)
      if (value) delete this.data[key][subKey]
      response = "ok"
    }

    return response
  }

  count() {

    return Object.keys(this.data).length

  }

  countKeys(key) {

    if (this.data.hasOwnProperty(key)) {
      return Object.values(this.data[key]).length

    } else {
      return 0
    }
  }

}

// Example usage
const limitedDriverObject = new LimitedSizeObject(5000);



const backPressure = 512 * 1024  //512kb 

let listenSocket;

const convertArrayBufferToString = (message) => {

  const uint8Array = new Uint8Array(message);
  const stringifiedMessage = Buffer.from(uint8Array)
  const wsMessage = JSON.parse(stringifiedMessage)
  return wsMessage

}


app
  // .get(
  //     `/api/health`, handleMiddlewares([
  //       tryCatch(durationStart),
  //       responseHandler(baseRoutes.checkHealth), 
  //       tryCatch(logger)
  // ]))
  // .get("/api/chats", handleMiddlewares([
  //   tryCatch(durationStart),
  //   tryCatch(AuthGuard), 
  //   tryCatch(validateRequest(getChatSchema)),
  //   tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
  //   responseHandler(chatController.getChats), 
  //   tryCatch(logger)
  // ]) )
  // .post("/api/chats", handleMiddlewares([
  //   tryCatch(durationStart),
  //   tryCatch(AuthGuard), 
  //   tryCatch(validateRequest(chatSchema)),
  //   tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
  //    responseHandler(chatController.createNewChat), 
  //    tryCatch(logger)
  // ]))
  // .get("/api/chats/:id",  handleMiddlewares([
  //   tryCatch(durationStart),
  //   tryCatch(AuthGuard), 
  //   tryCatch(validateRequest(getChatByIdSchema)),
  //   tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
  //    responseHandler(chatController.getChatById), 
  //    tryCatch(logger)
  // ]))
  // .get("/api/chats/ride/:rideId",  handleMiddlewares([
  //   tryCatch(durationStart),
  //   tryCatch(AuthGuard), 
  //   tryCatch(validateRequest(getChatByRideIdSchema)),
  //   tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
  //    responseHandler(chatController.getChatById), 
  //    tryCatch(logger)
  // ]))
  // .del("/api/chats",  handleMiddlewares([
  //   tryCatch(durationStart),
  //   tryCatch(AuthGuard), 
  //   tryCatch(validateRequest(deleteChatSchema)),
  //   tryCatch(verifyPermissions([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
  //    responseHandler(chatController.deleteChats), 
  //    tryCatch(logger)
  // ]))
  // .put("/api/chats/:id",  handleMiddlewares([
  //   tryCatch(durationStart),
  //   tryCatch(AuthGuard), 
  //   tryCatch(validateRequest(endChatSchema)),
  //   tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
  //    responseHandler(chatController.endChat), 
  //    tryCatch(logger)
  // ]))

  // //messages
  // .get(
  //   `/api/messages`, handleMiddlewares([
  //     tryCatch(durationStart),
  //     tryCatch(AuthGuard), 
  //     tryCatch(validateRequest(getMessagesSchema)),
  //     tryCatch(verifyPermissions([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV, ROLES.DRIVER, ROLES.RIDER])),
  //     responseHandler(messageController.getMessages), 
  //      tryCatch(logger)
  // ]))
  // .post("/api/messages", handleMiddlewares([
  // tryCatch(durationStart),
  // tryCatch(AuthGuard), 
  // tryCatch(validateRequest(messageSchema)),
  // tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
  //  responseHandler(chatController.createMessage), 
  //  tryCatch(logger)
  // ]))
  // .del("/api/messages",  handleMiddlewares([
  // tryCatch(durationStart),
  // tryCatch(AuthGuard), 
  // tryCatch(validateRequest(deleteMessagesSchema)),
  // tryCatch(verifyPermissions([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.CX])),
  //  responseHandler(messageController.deleteMessages), 
  //  tryCatch(logger)
  // ]))
  // //Route receiver
  // .post("/api/route",handleMiddlewares([
  //   tryCatch(durationStart),
  //   tryCatch(AuthGuard), 
  //   tryCatch(validateRequest()),
  //   tryCatch(verifyPermissions([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV, ROLES.DRIVER, ROLES.RIDER])),
  //    responseHandler(messageController.deleteMessages), 
  //    tryCatch(logger) 
  //   ]))

  .ws('/*', {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 6 * 1024,
    idleTimeout: 120,

    upgrade: async (res, req, context) => {


      /* Keep track of abortions */

      res.onAborted(() => {
        /* We can simply signal that we were aborted */
        upgradeAborted.aborted = true;
      });

      const upgradeAborted = { aborted: false };




      try {

        const queryParams = req.getQuery()

        const token = queryParams.split('&').find(param => param.startsWith('token=')).split('=')[1];

        const mobileId = queryParams.split('&').find(param => param.startsWith('mobile_device_id=')).split('=')[1];

        if (!token || !mobileId) {

          throw new Error("invalid authentication request format")

        }

        await AuthGuard(res, req, token, mobileId)

      } catch (e) {
        console.log(e, "error here")
        res.error = "invalid authentication request format"
      }

      userInfo = {
        user: res.user,
        role: res.role,

      }

      /* You MUST copy data out of req here, as req is only valid within this immediate callback */
      const url = req.getUrl();
      const userData = userInfo
      const secWebSocketKey = req.getHeader("sec-websocket-key");
      const secWebSocketProtocol = req.getHeader("sec-websocket-protocol");
      const secWebSocketExtensions = req.getHeader("sec-websocket-extensions");

      if (upgradeAborted.aborted) {
        console.log("Ouch! Client disconnected before we could upgrade it!");
        /* You must not upgrade now */
        return;
      }

      res.cork(async () => {
        const upgradeData = {
          url: url,
          error: res.error,
          data: {
            ...userData
          },

        };


        res.upgrade(
          upgradeData,
          secWebSocketKey,
          secWebSocketProtocol,
          secWebSocketExtensions,
          context
        );
      })

    },



    open: async (ws) => {
      try {
        const { url, error, ...wsData } = ws
        const data = wsData?.data
        const user = data?.user
        const role = data?.role

        if (error) {

          ws.send(JSON.stringify({ type: "connection error", message: error }));

          setTimeout(() => {
            ws.close();
          }, 100); // delay the close operation for 100ms

          return

        }


        if (!role) {

          ws.send(JSON.stringify({ type: "connection error ", message: "No role found" }))
          // errorLogger.error(`Websocket Auth error - No role found for user ${user} - `)
          setTimeout(() => {
            ws.close();
          }, 100); // delay the close operation for 100ms

          return
        }

        activeConnections.set(user, wsData);
        console.log(activeConnections)
        ws.send(JSON.stringify({ type: "connected", message: new Date() }))
      } catch (e) {

        const { data } = ws
        const user = data?.user
        // errorLogger.error(`Websocket open error -  ${user} - `)
        ws.send(JSON.stringify({ type: "open connection error ", message: new Date() }))
        setTimeout(() => {
          ws.close();
        }, 100); // delay the close operation for 100ms

        return
      }


    },

    message: async (ws, message, isBinary) => {
      // message must have action

      try {
        const wsMessage = convertArrayBufferToString(message);

        const response = await handleWebsocketMessages(ws, wsMessage, isBinary, limitedDriverObject);



        const ok = ws.send(JSON.stringify(response));

        if (ok && response.shouldClose) ws.close();
      } catch (e) {
        console.log(e, "eooerro");
        // errorLogger.error(`websocket message error - user -   ${ws.data.user} -  error - ${e}`)
        // ws.send(JSON.stringify({ type : "location_message_receipt_error", message : "An error has occurred.Please try again"}))
        // ws.close()
      }
    },

    subscription: (ws, topic, newCount, oldCount) => {
      const stringifiedMessage = Buffer.from(topic);

      // console.log("subscription.ws", ws);
      // // console.log("subscription.topic", JSON.parse(stringifiedMessage));
      // console.log("subscription.newCount", newCount);
      // console.log("subscription.oldcount", oldCount);
    },

    dropped: (ws, message, isBinary) => {
      console.log("JJJ")
      // Wait for the message, especially if it is a chat message
      while (ws.getBufferedAmount < backPressure) {
        const wsMessage = convertArrayBufferToString(message);

        const { message } = wsMessage;

        if (type !== "price_negotiated" || type !== "rideRequest") {
          ws.send(JSON.stringify(message));
        }
      }
    },

    drain: (ws) => {
      console.log('WebSocket backpressure: ' + ws.getBufferedAmount());

      // while (ws.getBufferedAmount() < backPressure) {
      //   ws.send("This is a message, let's call it " + messageNumber);
      //   messageNumber++;
      //   messages++;
      // }
    },

    close: async (ws, code, message) => {


      try {

        let socketCell

        if (ws?.data?.currentCell)
          socketCell = activeConnections.get(ws.data?.currentCell);

        if (ws?.data?.user)
          activeConnections.delete(ws.data.user);

        // If user is a driver
        if (socketCell && ws?.data?.role === ROLES.DRIVER) {
          // This is to remove the user from the h3 cellId of the limitedDriverObject on disconnection
          delete limitedDriverObject[socketCell][ws.data.user];
        }

        console.log(activeConnections);


      } catch (e) {
        console.log(e);
      }
      console.log('WebSocket closed');




    }
  })
  .any("/*", (res, req) => {
    res.writeStatus(JSON.stringify(404)).end(JSON.stringify({
      message: "404 Not Found. No matching resource",
    }));

  })
  .listen(port, (token) => {
    if (token) {

      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });

//Redis subcriber channel
try {
  subscriber.on('message', async (channel, message) => {

    console.log("RedisMessage", message)

    const wsMessage = JSON.parse(message)

    const { type } = wsMessage

    //Any message here can be  dropped, they are location pings ,  we subscribe drivers to their userId for major messages and cell ids for pings , so if we have a cell that is in the activeConnectionSocket, it is a driverChannel for specific driver-rider communication

    if (type === "rideRequest") {

      const driversInSocket = limitedDriverObject.get(channel)
      console.log(driversInSocket)

      if (driversInSocket) {
        const sockets = Object.values(driversInSocket)


        for (const socket of sockets) {
          console.log(socket, wsMessage, "Liam")



          //Keep the 20 allowance for the other message types
          console.log(socket?.getBufferedAmount(), "socket")
          try {

            const distance = await PolylineUtils.calculateDistanceBetweenPoints(socket.destination, wsMessage.destination)

            if (distance > 10) continue


            if (socket.getBufferedAmount() < backPressure - 20) {
              //check the distance btw the driver and rider




              socket.send(JSON.stringify(message))
            }
          } catch (e) {
            console.log(e)
          }

          return
        }
      }

    } else {

      //Get the ws data from activeConnections  
      const userSocket = activeConnections.get(channel)

      if (userSocket) {

        if (type === "price_negotiated") {
          //To avoid overloading the ride ws connection with quotes from too many drivers, while still keeping an open space for other message types
          if (userSocket.getBufferedAmount() < backPressure - 10) {
            userSocket.send(JSON.stringify(wsMessage))
          }
        }
        else {//these are important messages that should never be droppped
          userSocket.send(JSON.stringify(wsMessage))
        }


      }

    }





    //if the channel exists, this is not a location ping channel

    // const { type } =  wsMessage 



    //     if (type === "driver_price_update" ){

    //       const  { channel, location } =  wsMessage 

    //       const channelSockets  =  activeDriverCellTopics.get(channel) 

    //       if(channelSockets){
    //         const socketsArray  =  Object.values(channelSockets)  // { id : ws}
    //         for(const socket of socketsArray){ 

    //            //Check if the destination of the driver is within xkm from the riders destination

    //            const nearestPoint  =  PolylineUtils.getNearestPointOnLine(socket.lineString, wsMessage.location)
    // //call the routing service and check the actual distance
    //            const routeData  =  await axios.get()

    //            const { distance,  polyline, travelTime } = routeData 

    //            if(Math.floor(distance) > 7 )  


    //             //check if this driver is even close enough : The driver is broadcasting on cell 5, we need to be sure  that the rider on cell 7 is close to this driver, otherwise  it makes zero sense to broadcast to the user
    //             const driverLocationOnCell8 =  await PolylineUtils.convertCoordinatesToH3CellId(wsMessage.location, 8)
    //             const riderLocationCell =  await PolylineUtils.convertCoordinatesToH3CellId(JSON.parse(socket).location)
    //             const surroundingCells = await PolylineUtils.getSurroundingCellsAtRadius(riderLocationCell, 3) //3km 

    //               const isCloseEnough =  surroundingCells.includes(driverLocationOnCell8)

    //               //Now we need to ascertain if the 

    //           //Keep allowance for other more important messages like chats // ride end etc
    //           if(socket.getBufferedAmount < backPressure - 20 && isCloseEnough)
    //             {
    //               socket.send(wsMessage)
    //           } 
    //         }
    //       }


    //      } 
    //      else { 
    app.publish(channel, message)
    //  }
  })

} catch (e) {
  console.log(e)
}








process.on("uncaughtException", (error) => {
  console.log(`Unhandled Rejection: ${error}`)
  // logEvents(`${error.name}: ${error.message}\t${error?.stack}`, "uncaughtExceptions.log")
  process.exit(1)
})

process.on("unhandledRejection", (error) => {
  // logEvents(`${error.name}: ${error.message}\t${error?.stack}`, "unhandledRejections.log")
  process.exit(1)
})





closeWithGrace(
  {
    delay: 500,
    logger: {
      error: async (m) =>
        await logEvents(`[close-with-grace] ${m}`, "serverCloseLogs.log"),
    },
  },
  async function ({ signal, err, manual }) {
    if (err) {
      console.error(signal, err, manual);
    }
    await uWS.us_listen_socket_close(listenSocket);
    listenSocket = null;
  }
);



