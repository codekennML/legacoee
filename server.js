require("dotenv").config();
const { app, port } = require("./app");

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
const RiderService = require("./services/RiderService");

const baseUrl = `api/v1`;
const baseUrl_user = `api/v1/user`;
const baseUrl_admin = `api/v1/admin`;

//Keep count of active connections
const activeConnections = new Map();

const pubSubClientSubscriber = new redisClass(pubsubRedis).subscribeToChannel(
  `${process.env.APP_ID}`
);

const pubSubClientPublisher = new redisClass(pubSubRedis).publishToChannel();

pubSubClient.on("message", (message, channel) => {
  const { topic, data } = JSON.parse(message);
});

app
  //Public

  //Auth Routes
  .get(`${baseUrl}/health`, responseHandler(baseRoutes.checkHealth))
  .post(`${baseUrl}/auth/signup`)
  .post(`${baseUrl}/auth/login`)
  .post(`${baseUrl}/auth/forgot_password`)
  .post(`${baseUrl}/auth/reset_password`)
  .post(`${baseUrl}/auth/activate_account`)

  //Authenticated Routes -  USERS
  .post(
    `${baseUrl_user}/auth/activate_account`,
    responseHandler(baseRoutes.retrievePolyline, responder)
  )

  //Drivers
  .ws(`${baseUrl_user}/initialize_trip`, {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 10,
    /* Handlers */
    upgrade: async (res, req, context) => {
      console.log(
        "An Http connection wants to become WebSocket, URL: " +
          req.getUrl() +
          "!"
      );

      /* Keep track of abortions */
      const upgradeAborted = { aborted: false };

      /* You MUST copy data out of req here, as req is only valid within this immediate callback */
      const url = req.getUrl();
      // const secWebSocketKey = req.getHeader('sec-websocket-key');
      // const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
      // const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');

      /* Simulate doing "async" work before upgrading */

      if (upgradeAborted.aborted) {
        console.log("Ouch! Client disconnected before we could upgrade it!");
        /* You must not upgrade now */
        return;
      }

      /* Cork any async response including upgrade */
      res.cork(async () => {
        let response;

        const body = responseHandler.handlePostRequest(res);

        //Check if its rider or driver and handle appriopriately
        const { userType } = body;

        if (!userType) upgradeAborted.aborted = true;

        //Handle Driver WS calls

        if (userType === "driver") {
          tryCatch(async () => {
            //No ongoing trip definitely
            if (!body?.trip) {
              //ToDO : Check that the driver does not have an ongoing trip , because they could have wiped the data

              let result;

              const {
                driverId,
                destination_place_id,
                current_location_coordinates,
              } = body;

              //Get the directions and send to the FE
              const {
                polylines,
                riderCurrentLocationData,
                riderDestinationData,
                fare,
              } = await DirectionsService.getDirectionsData(
                current_location_coordinates.lat,
                current_location_coordinates.lng,
                destination_place_id
              );

              result = {
                driverId,
                new_trip: true,
                polylines,
                riderCurrentLocationData,
                riderDestinationData,
                fare,
              };
              //Create a new driver trip

              //  const createdTrip  =  await TripService.createTrip({
              //    driverId,
              //    ongoing : true,
              //    polylines,
              //    riderCurrentLocationData,
              //    riderDestinationData
              //  })

              // result =  createdTrip
            } else {
              const data = await TripService.getTripData(tripId);

              result = {
                new_trip: false,
                ...data,
              };
            }

            if (result.error) upgradeAborted.aborted = true;

            response = result;

            //      response  = { data :  { driverId : result.driverId,
            //       polylines : result.driver.polylines,
            //       ongoing:result.ongoing,
            //       coordinates  : {
            //        lat : parseInt(body.coordinates.lat),
            //        lng : parseInt(body.coordinates.lng)
            //       }

            //      }

            // }
          });
        }
        //Handle Rider WS messages
        if (userType === "rider") {
          //Create and manage rider service

          // let riderResult;

          const riderResult = tryCatch(async () => {
            if (!body.rideId) {
              //No ongoing trip
              //TODO : Check for trip in db first

              const {
                riderId,
                destination_place_id,
                current_location_coordinates,
              } = body;

              //Get the directions and create a new driver trip
              const {
                polylines,
                riderCurrentLocationData,
                riderDestinationData,
                fare,
              } = await DirectionsService.getDirectionsData(
                current_location_coordinates.lat,
                current_location_coordinates.lng,
                destination_place_id
              );

              const riderResult = {
                riderId,
                polyline: polylines[0],
                riderCurrentLocationData,
                riderDestinationData,
                fare,
              };

              return riderResult;

              // const createdRide  =  await RiderService.createNewRide({ polylines, riderCurrentLocationData, riderDestinationData, riderId})

              //  riderResult =  createdRide
            } else {
              const rideInfo = await RiderService.getRide(body.rideId);

              const riderResult = {
                riderId: rideInfo.riderId,
                polyline: rideInfo.rideData.polyline,
                riderCurrentLocationData: rideInfo.start_location,
                riderDestinationData: rideInfo.destination,
                fare: rideInfo.ride_fare_estimate,
              };

              return riderResult;
            }
          });

          if (riderResult.error) upgradeAborted.aborted = true;

          /* You MUST register an abort handler to know if the upgrade was aborted by peer */
        }
      });
      res.onAborted(() => {
        /* We can simply signal that we were aborted */
        upgradeAborted.aborted = true;
      });
    },

    open: (ws) => {
      //Keep count of connected clients
      //  await twemproxyRedis.incr(`${process.env.APP_ID}_WS_COUNT`)
      //Keep track of connected clients Id
      const { driverId, riderId } = ws.data;
      activeConnections.set(driverId ?? riderId, ws);

      //Subscribe the client to receive incoming messages for it
      ws.subscribe(driverId);

      //Each server will have a unique app id
      console.log(
        `A WebSocket connection made to server ${process.env.APP_ID} with URL: ${ws.url}`
      );

      ws.send(response, isBinary);
    },
    message: async (ws, message, isBinary) => {
      let response;
      //Check the message type or topic

      const newMessage = JSON.parse(message);

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
      console.log("WebSocket closed");
      await twemproxyRedis.decr(`${process.env.APP_ID}_WS_COUNT`);
      //Keep track of connected clients Id
      const { driverId, riderId } = ws.data;
      delete activeConnections[driverId ?? riderId];
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
