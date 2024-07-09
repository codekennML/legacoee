require("dotenv").config();
const { app, port, handleMiddlewares, uWS } =  require("./app")
// const querystring = require("querystring");
const closeWithGrace = require("close-with-grace")
const { driverRoutes, baseRoutes } = require("./src/routes/base");
const {  chatSchema, 
  deleteChatSchema, 
  getChatByIdSchema,
  getChatByRideIdSchema,
  endChatSchema,
  getChatSchema} = require("./src/routes/schemas/chats")
 const { getMessagesSchema, messageSchema,  deleteMessagesSchema } = require("./src/routes/schemas/messages")
const {responseHandler, readJSON} = require("./responsehandler");
const { logger } = require("./src/middlewares/logger/events");
const { durationStart } = require("./src/middlewares/logger/requests");
const tryCatch = require("./src/utils/helpers/tryCatch");
const chatController =  require("./src/controllers/chats")
const messageController =  require("./src/controllers/message");
const { errorLogger } = require("./src/middlewares/logger/winston");

const {redisClient} = require("./src/config/redis/index")
const { AuthGuard } = require("./src/middlewares/auth/verifyAccessToken")
const { verifyPermissions } = require("./src/middlewares/auth/permissionGuard")
const validateRequest = require("./src/middlewares/validators/index")
const { ROLES }  = require("./src/config/enums");
const AppError = require("./src/middlewares/errors/BaseError");
const { handleWebsocketMessages, activeConnections, activeTopics }  =  require("./src/services/websocketMessages")


const backPressure =  512 * 1024  //512kb 

let listenSocket; 

const convertArrayBufferToString =  (message ) => { 

  const uint8Array = new Uint8Array(message);
  const stringifiedMessage =  Buffer.from(uint8Array) 
  const wsMessage =  JSON.parse(stringifiedMessage)
  return wsMessage

}


app
.get(
    `/api/health`, handleMiddlewares([
      tryCatch(durationStart),
      responseHandler(baseRoutes.checkHealth), 
      tryCatch(logger)
]))
.get("/api/chats", handleMiddlewares([
  tryCatch(durationStart),
  tryCatch(AuthGuard), 
  tryCatch(validateRequest(getChatSchema)),
  tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
  responseHandler(chatController.getChats), 
  tryCatch(logger)
]) )
.post("/api/chats", handleMiddlewares([
  tryCatch(durationStart),
  tryCatch(AuthGuard), 
  tryCatch(validateRequest(chatSchema)),
  tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
   responseHandler(chatController.createNewChat), 
   tryCatch(logger)
]))
.get("/api/chats/:id",  handleMiddlewares([
  tryCatch(durationStart),
  tryCatch(AuthGuard), 
  tryCatch(validateRequest(getChatByIdSchema)),
  tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
   responseHandler(chatController.getChatById), 
   tryCatch(logger)
]))
.get("/api/chats/ride/:rideId",  handleMiddlewares([
  tryCatch(durationStart),
  tryCatch(AuthGuard), 
  tryCatch(validateRequest(getChatByRideIdSchema)),
  tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
   responseHandler(chatController.getChatById), 
   tryCatch(logger)
]))
.del("/api/chats",  handleMiddlewares([
  tryCatch(durationStart),
  tryCatch(AuthGuard), 
  tryCatch(validateRequest(deleteChatSchema)),
  tryCatch(verifyPermissions([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
   responseHandler(chatController.deleteChats), 
   tryCatch(logger)
]))
.put("/api/chats/:id",  handleMiddlewares([
  tryCatch(durationStart),
  tryCatch(AuthGuard), 
  tryCatch(validateRequest(endChatSchema)),
  tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
   responseHandler(chatController.endChat), 
   tryCatch(logger)
]))

//messages
.get(
  `/api/messages`, handleMiddlewares([
    tryCatch(durationStart),
    tryCatch(AuthGuard), 
    tryCatch(validateRequest(getMessagesSchema)),
    tryCatch(verifyPermissions([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV, ROLES.DRIVER, ROLES.RIDER])),
    responseHandler(messageController.getMessages), 
     tryCatch(logger)
]))
.post("/api/messages", handleMiddlewares([
tryCatch(durationStart),
tryCatch(AuthGuard), 
tryCatch(validateRequest(messageSchema)),
tryCatch(verifyPermissions([ROLES.DRIVER, ROLES.RIDER,  ROLES.CX, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV])),
 responseHandler(chatController.createMessage), 
 tryCatch(logger)
]))
.del("/api/messages",  handleMiddlewares([
tryCatch(durationStart),
tryCatch(AuthGuard), 
tryCatch(validateRequest(deleteMessagesSchema)),
tryCatch(verifyPermissions([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.CX])),
 responseHandler(messageController.deleteMessages), 
 tryCatch(logger)
]))
//Route receiver
.post("/route",handleMiddlewares([
  tryCatch(durationStart),
  tryCatch(AuthGuard), 
  tryCatch(validateRequest()),
  tryCatch(verifyPermissions([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DEV, ROLES.DRIVER, ROLES.RIDER])),
   responseHandler(messageController.deleteMessages), 
   tryCatch(logger) 
  ]))

.ws('/*', {

  /* Options */
  compression: uWS.SHARED_COMPRESSOR,
  maxPayloadLength: 6 * 1024,
  idleTimeout: 120,
  closeOnBackpressureLimit : false,
  maxBackpressure : 1024 * 1024,
  sendPingsAutomatically : true,
  

  upgrade: async (res, req, context) => {
    
    try{ 
        /* Keep track of abortions */
    
      res.onAborted(() => {
        /* We can simply signal that we were aborted */
        upgradeAborted.aborted = true;
      });

      const upgradeAborted = {aborted: false};
    
     let userInfo;

      // await AuthGuard(res, req)  
       userInfo  =  { 
        user : res.user, 
        role : res.role,
    
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
    

  }
    catch(err){
try{
  if(err instanceof AppError) {
    res.writeStatus(JSON.stringify(err?.statusCode)).end(JSON.stringify(err.message))
  }
   else {
    res.writeStatus("500").end("Something went wrong")
  }
}catch(e){
  console.log(e)
}
 
}
  },
  
  open: (ws) => {
  
    
try {
     const { url , ...wsData} = ws
    const { user, role } = wsData.data;

    
    //TODO unncomment when done 
    //    if(!role) {
    
    //   ws.send(JSON.stringify({ type : "connection error ", message : "No role found"}))
    //       // errorLogger.error(`Websocket Auth error - No role found for user ${user} - `)
    //    ws.close()
    // }
      
    activeConnections.set(user, wsData);
    console.log(activeConnections)
    ws.send(JSON.stringify({ type : "connected", message : new Date()}))
}catch(e){

    const { data } =  ws
    const user = data?.user
    // errorLogger.error(`Websocket open error -  ${user} - `)
    ws.send(JSON.stringify({ type : "open connection error ", message : new Date()}))
    ws.close()
}

  },

  message: async(ws, message, isBinary) => { 
    console.log(message, typeof message) //message must have action 
  try {

    const wsMessage = convertArrayBufferToString(message)
   
   const response =  await handleWebsocketMessages(ws, wsMessage, isBinary) 
 
   if(response && response.error) { 
    console.log("Moz")
        ws.send(JSON.stringify(response))  

    } 



     if(response &&  response?.shouldClose){
      return  ws.close()
      } 

      if(response && response.success){
        ws.send(JSON.stringify(response))
      }
 
 
     const ok =    ws.send(JSON.stringify({ 
                success : true ,
                action : message.action
              }))
      
   
  
      


   }
    catch(e){
      console.log(e,  "eooerro")
      // errorLogger.error(`websocket message error - user -   ${ws.data.user} -  error - ${e}`)
      // ws.send(JSON.stringify({ type : "location_message_receipt_error", message : "An error has occurred.Please try again"}))
      // ws.close()
  
    }

},
  subscription: (ws, topic, newCount, oldCount) => {
     
      const stringifiedMessage =  Buffer.from(topic)

    console.log("subscription.ws", ws);
    // console.log("subscription.topic", JSON.parse(stringifiedMessage));
    console.log("subscription.newCount", newCount);
    console.log("subscription.oldcount", oldCount);
  },

  dropped : (ws, message, isBinary) => {
    
       //Wait for the messge , especially if it is a chat message 
    if (ws.getBufferedAmount < backPressure){ 
          const wsMessage  =  convertArrayBufferToString(message) 

          const {  message  }  =  wsMessage 

          if(type === "rideChat_message"){ 
               ws.send(JSON.stringify(message))
          }
    }


  }, 
  drain: (ws) => {
    console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
  },
  close: (ws, code, message) => {
    //First get the ws id 

    const wsData  =  activeConnections.get(ws.id)
    const channel  = wsData.channel 

    const socketsInChannel = activeTopics.get(channel)  //this will return an object  
    if(socketsInChannel) {
      const sockets =  JSON.parse(socketsInChannel)
      delete sockets[ws.id] 
      activeTopics.set(channel, JSON.stringify(sockets))
      
    }
    
    console.log('WebSocket closed');
  }
}).any("/*", (res, req) => {
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


process.on("uncaughtException", (error ) => { 
  console.log(`Unhandled Rejection: ${error}`)
  // logEvents(`${error.name}: ${error.message}\t${error?.stack}`, "uncaughtExceptions.log")
  process.exit(1)
})

process.on("unhandledRejection", (error ) => {
  // logEvents(`${error.name}: ${error.message}\t${error?.stack}`, "unhandledRejections.log")
  process.exit(1)
})


try{
  redisClient.on('message', (channel, message) => { 

    const wsMessage =  JSON.parse(message) 
    const { type} =  wsMessage
    
    if (type === "locationUpdates"){
      const  { channel } =  wsMessage 

      const channelSockets  =  activeTopics.get(channel) 

      if(channelSockets){
        const socketsArray  =  Object.values(channelSockets)  // { id : ws}
        for(const socket of socketsArray){ 
          
          //Keep allowance for other more important messages like chats // ride end etc
          if(socket.getBufferedAmount < backPressure - 20 )
            {
              socket.send(wsMessage)
          } 
        }
      }


     } 
     else { 
       app.publish(channel, message)
     }
  })

}catch(e){
   console.log(e)
}

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


