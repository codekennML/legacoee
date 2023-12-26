require("dotenv").config();
const { app, port,uWS } = require("./app");
const querystring = require('querystring');
const {
  twemproxyRedis,
  pubsubRedis,
  redisClass,
} = require("./services/3rdParty/redis/index");
const AppError = require("./middlewares/errors/BaseError");
const { driverRoutes, baseRoutes } = require("./routes/base");
const TripService = require("./services/TripService");

const responseHandler = require("./responsehandler");
const tryCatch = require("./utils/tryCatch");

const DirectionsService = require("./services/DirectionsService");
const RideMessageService = require("./services/RideMessageService");
const UserService = require("./services/UserService");
const DriverService = require("./services/DriverService");
const RiderService = require("./services/RideService");
const RideService = require("./services/RideService");

const base_url = `/api/v1`;
const baseUrl_user = `api/v1/user`;
const baseUrl_admin = `api/v1/admin`;

//Keep count of active connections
const activeConnections = new Map();

// const pubSubClientSubscriber = new redisClass(pubsubRedis).subscribeToChannel(
//   `${process.env.APP_ID}`
// );

// const pubSubClientPublisher = new redisClass(pubSubRedis).publishToChannel();

// pubSubClient.on("message", (message, channel) => {
//   const { topic, data } = JSON.parse(message);
// });

app
  //Public

  //Auth Routes
  .get(`${base_url}/health`, responseHandler.responseHandler(baseRoutes.checkHealth))
  // .post(`${baseUrl}/auth/signup`)
  // .post(`${baseUrl}/auth/login`)
  // .post(`${baseUrl}/auth/forgot_password`)
  // .post(`${baseUrl}/auth/reset_password`)
  // .post(`${baseUrl}/auth/activate_account`)

  //Authenticated Routes -  USERS
  // .post(
  //   `${baseUrl_user}/auth/activate_account`,
  //   responseHandler(baseRoutes.retrievePolyline, responder)
  // )

  //Drivers
  .ws(`${base_url}/initialize_trip`, {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 10,
    /* Handlers */
    upgrade: async (res, req, context) => {
      console.log(
        "An http connection wants to become WebSocket, URL: " +
          req.getUrl() +
          "!"
      );

      // Extract query parameters from the URL
    const queryParamsString = req.getQuery();

    // Parse query parameters into an object
    const queryParams = querystring.parse(queryParamsString);

      // Convert the object to a standard JavaScript object
    const body = Object.assign({}, queryParams);

 

    // Handle incoming data
   

      /* Keep track of abortions */
      const upgradeAborted = { aborted: false };

      /* You MUST copy data out of req here, as req is only valid within this immediate callback */
      const url = req.getUrl();
          const secWebSocketKey = req.getHeader('sec-websocket-key');
    const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
    const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');
     
      // res.onAborted(() => {
      //   /* We can simply signal that we were aborted */
      //   upgradeAborted.aborted = true;
      // })

      // let response;


     

      res.onAborted(() => {
        /* We can simply signal that we were aborted */
        upgradeAborted.aborted = true;
        
      }); 
      

   
    if (upgradeAborted.aborted) {
        console.log("Ouch! Client disconnected before we could upgrade it!");
        /* You must not upgrade now */
        return;
      }
    

      res.cork(async() => {


      res.upgrade(
          { url: url,
            data : { 
              user : body.userId,
              type : body.userType
            }
            //  data: response
             },
          /* Use our copies here */
          secWebSocketKey,
          secWebSocketProtocol,
          secWebSocketExtensions,
          context
        );

  //  console.log("Hello")
      


        // console.log(body)

        //Check if its rider or driver and handle appriopriately
        // const { userType } = body;

        // if (!userType) upgradeAborted.aborted = true;

        //Handle Driver WS calls

     
        //Handle Rider WS messages
      
        // console.log(response)

        // if (response?.error)upgradeAborted.aborted = true;

       
    
      });

      
  
    },

    open: async(ws) => {
      //Keep count of connected clients
      //  await twemproxyRedis.incr(`${process.env.APP_ID}_WS_COUNT`)
      //Keep track of connected clients Id
      const { user, type} =  ws.data

      activeConnections.set(user, ws)

      console.log(activeConnections)
     //Subscribe the user to their specific channel
      ws.subscribe(user); 


      //Check if user has ongoing trip or ride  
      let  statusData

      switch(user){

        case "driver" : 
        const trip = tryCatch(async()=> await DriverService.getDriverTrips({ 
          query : { 
            driverId : user,
            ongoing : { $eq : true}
          }, 
          aggregateData  :[
          { $limit : 1 }
        ]   
       })) 

       return trip
        //Check for ongoing trips and get details
        break 

        case "rider" :

        const riderRide =  tryCatch(async()=> await RideService.getRides({ 
        
          query : { 
            riderId : user,
            ongoing : { $eq : true}
          }, 
          aggregateData  :[
          { $limit : 1 }
        ]   
       }
        ) )
         
        if(riderRide.length > 0 ) ws.send(JSON.stringify(riderRide))
       
      
          //Check for ongoing ride and fetch details
        break  

        default:
        ws.close()
      }

    ws.send()
  
      //Subscribe the client to receive incoming messages for it

      //Each server will have a unique app id
       console.log('A WebSocket connected with URL: ' + ws.url);


       ws.send(JSON.stringify(statusData))
        // `A WebSocket connection made to server ${process.env.APP_ID} with URL: ${ws.url}`

        //Check if there is an ongoing trip or ride and send back the data   
         


    
    },
    message: async (ws, message, isBinary) => {

      console.log(message)
      // let response;
      // //Check the message type or topic

      const newMessage = JSON.parse(message);

  // if (userType === "rider") {
        //   //Create and manage rider service

        //   // let riderResult;

        //   response = tryCatch(async () => {
        //     if (!body.rideId) {
        //       //No ongoing trip
        //       //TODO : Check for trip in db first

        //       const {
        //         riderId,
        //         destination_place_id,
        //         current_location_coordinates,
        //       } = body;

        //       //Get the directions and create a new driver trip
        //       const {
        //         polylines,
        //         riderCurrentLocationData,
        //         riderDestinationData,
        //         fare,
        //       } = await DirectionsService.getDirectionsData(
        //         current_location_coordinates.lat,
        //         current_location_coordinates.lng,
        //         destination_place_id
        //       );

        //       const riderResult = {
        //         new_trip: true,
        //         riderId,
        //         polyline: polylines[0],
        //         riderCurrentLocationData,
        //         riderDestinationData,
        //         fare,
        //       };

        //       return riderResult;

        //       // const createdRide  =  await RiderService.createNewRide({ polylines, riderCurrentLocationData, riderDestinationData, riderId})

        //       //  riderResult =  createdRide
        //     } else {
        //       const rideInfo = await RiderService.getRide(body.rideId);

        //       const riderResult = {
        //         new_trip: false,
        //         riderId: rideInfo.riderId,
        //         polyline: rideInfo.rideData.polyline,
        //         riderCurrentLocationData: rideInfo.start_location,
        //         riderDestinationData: rideInfo.destination,
        //         fare: rideInfo.ride_fare_estimate,
        //       };

        //       return riderResult;
        //     }
        //   });

        //   /* You MUST register an abort handler to know if the upgrade was aborted by peer */
        // }




      const { userType } = newMessage; //User Type is the type of user this message is going to
      if (userType === "driver") {
        response = await DriverService.handleDriverWsMessages(newMessage);
      } else if (userType === "rider") {
        response = await RiderService.handleRiderWSMessages(newMessage);
      } else return;

      if (response) {
        let ok = ws.send(response, isBinary);

        console.log(ok);
      }
    },

    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },

    close: async (ws, code, message) => {
      //Decrease redis  websocket connection count for this server
      const { user } = ws

      console.log("WebSocket closed");

      // await twemproxyRedis.decr(`${process.env.APP_ID}_WS_COUNT`);
      //Keep track of connected clients Id
      // const { driverId, riderId } = ws.data;
      delete activeConnections[user];

      console.log(activeConnections.size)
    },
  })

  //Riders
  // .post(`${baseUrl}/riders/initialize_trip`, responseHandler(baseRoutesHandler.baseRoute))

  .listen(port, (token) => {
    if (token) {
      console.log("Hiiii", token);
      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });
