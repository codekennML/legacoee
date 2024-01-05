require("dotenv").config();
const { app, port, uWS } = require("./app");
const querystring = require("querystring");
const {
  twemproxyRedis,
  pubsubRedis,
  redisClass,
  pubSubRedis,
} = require("./services/3rdParty/redis/index");
const AppError = require("./middlewares/errors/BaseError");
const { driverRoutes, baseRoutes } = require("./routes/base");
const TripService = require("./services/TripService");

const responseHandler = require("./responsehandler");

const DriverService = require("./services/DriverService");

const driverController = require("./controllers/driverController");

const RiderService = require("./services/RideService");
const RideService = require("./services/RideService");
const driverController = require("./controllers/driverController");
const rideController = require("./controllers/rideController");
const sendWsMessage = require("./utils/helpers/sendWsMessage");
const authController = require("./controllers/authController");

const base_url = `/api/v1`;
const baseUrl_user = `api/v1/user`;
const baseUrl_admin = `api/v1/admin`;

//Keep count of active connections
const activeConnections = new Map();

//initialize redis connections

//Twemproxy redis channel for server
const server_pubsub_channel = `channel:${process.env.APP_ID}`;

pubsubRedis.subscribeToChannel(server_pubsub_channel);

pubsubRedis.on("message", async (channel, message) => {
  if (channel !== `channel:${process.env.APP_ID}`) return;

  const parsedMessage = JSON.parse(message);

  const { topic, ...data } = parsedMessage;

  switch (topic) {
    case "ride_request_bargain":
      const { recipients } = data;
      //We  might need to throttle this to not over burden  the server
      for (const recipient of recipients) {
        const { id, recipientData } = recipient;

        const ws = activeConnections[id];

        if (!id || !ws) break;

        ws.send(recipientData);

        sleep(120);
      }

      break;

    case "driver_price_response":
      const { riderId, amount, driver, available_seats } = data;

      // const ws = activeConnections[riderId];

      if (!riderId) break;

      const isAlreadyAssigned = acceptedRidesCache[riderId];

      // const response = await pubsubRedis.get(riderId);

      //create a cache for accepted rides on

      if (isAlreadyAssigned) break; //This means the rider has already accepted another drivers request

      const bargainMessage = {
        amount,
        driver,
        available_seats,
      };

      // await pubSubRedis.publishToChannel(`channel:${riderServerId}`, JSON.stringify(bargainMessage))

      const riderWs = activeConnections[riderId];

      if (!riderWs) break;

      riderWs.send(bargainMessage);

      break;

    case "pickup _cancelled":
      break;

    default:
      break;
  }

  let ws;

  if (riderId) {
    const ws = activeConnections[riderId];
  } else {
    const ws = activeConnections[driverId];
  }
  if (!socket) ws.send(data);
  //Get the message and send it to the owner via their socket
});

app
  //Public
  .get(
    `${base_url}/health`,
    responseHandler.responseHandler(baseRoutes.checkHealth)
  )

  //Auth
  .post(
    `${baseUrl_user}`,
    responseHandler.responseHandler(authController.signup)
  )
  // .post(`${baseUrl}/auth/signup`)
  // .post(`${baseUrl}/auth/login`)
  // .post(`${baseUrl}/auth/forgot_password`)
  // .post(`${baseUrl}/auth/reset_password`)
  // .post(`${baseUrl}/auth/activate_account`)

  //Drivers
  .post(
    `${baseUrl_user}/driver/ongoing`,
    responseHandler.responseHandler(driverController.getOngoingDriverTrip)
  )

  //Riders
  .post(
    `${baseUrl_user}/rider/ongoing`,
    responseHandler.responseHandler(rideController.getOngoingRiderTrip)
  )
  .get(`${baseUrl_user}/rider/fav_places`)

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

      /* Keep track of abortions */
      const upgradeAborted = { aborted: false };

      /* You MUST copy data out of req here, as req is only valid within this immediate callback */
      const url = req.getUrl();
      const secWebSocketKey = req.getHeader("sec-websocket-key");
      const secWebSocketProtocol = req.getHeader("sec-websocket-protocol");
      const secWebSocketExtensions = req.getHeader("sec-websocket-extensions");

      res.onAborted(() => {
        /* We can simply signal that we were aborted */
        upgradeAborted.aborted = true;
      });

      if (upgradeAborted.aborted) {
        console.log("Ouch! Client disconnected before we could upgrade it!");
        /* You must not upgrade now */
        return;
      }

      let history = {};

      //Get all the trips the driver must have missed
      if (body.userType === "driver") {
        (history["topic"] = "trip_history"),
          //This is to allow for any write that is being done on the rider serversfor this server to complete  first, simply to maintain consistency of data
          async function getTripDataOnConnection() {
            //Get all ongoing trips and then rides which have pickedUp as false
            const ongoingTripWithPendingPickups =
              await DriverService.getDriverTrips({
                query: {
                  _id: { $eq: mongoose.Types.ObjectId(body.userId) },
                  ongoing: true,
                },

                aggregateData: [
                  {
                    $lookup: {
                      from: "rides",
                      localField: "rides",
                      foreignField: "_id",
                      pipeline: {
                        $project: {
                          riderId: 1,
                          pickedUp: 1,
                          cancelled: 1,
                          rideData: 1,
                        },
                      },
                      as: "riders",
                    },
                  },
                  {
                    $project: {
                      riders: 1,
                      tripId,
                      tripLocations: 1,
                    },
                  },
                ],
              });

            const { meta, data } = ongoingTripWithPendingPickups;

            if (meta && meta?.count > 0) {
              history[`currentTrip`] = {
                tripLocations: data.tripLocations,
                tripId: data.tripId,
              };
            }

            if (data.length > 0) {
              history[`riders`] = data.riders;
            }
            return;
          };

        setTimeout(getTripDataOnConnection, 200);
      }

      if (body.userType === "rider") {
        //Get all ongoing rides
        history[`topic`] = `ride_history`;

        const rideHistory = await RideService.getOneRideDoc({
          params: {
            riderId: { $eq: mongoose.Types.ObjectId(body.userId) },
            ongoing: { $eq: true },
          },
          select: "_id",
        });

        if (!rideHistory) {
          history[`currentTrip`] = null;
          return;
        }

        history[`currentHistory`] - rideHistory;
      }

      res.cork(async () => {
        const upgradeData = {
          url: url,
          data: {
            user: body.userId,
            type: body.userType,
          },
          //  data: response
        };

        if (tripHistory?.topic) {
          upgradeData[`tripHistory`] = history;
        }
        res.upgrade(
          upgradeData,
          /* Use our copies here */
          secWebSocketKey,
          secWebSocketProtocol,
          secWebSocketExtensions,
          context
        );
      });
    },

    open: async (ws) => {
      //Keep count of connected clients
      //  await twemproxyRedis.incr(`${process.env.APP_ID}_WS_COUNT`)
      const { tripHistory, ...wsData } = ws;
      //Keep track of connected clients Id
      const { user, type } = wsData.data;

      activeConnections.set(user, wsData);

      console.log(activeConnections);
      //Subscribe the user to their specific channel
      wsData.subscribe(user);

      if (tripHistory) {
        sendWsMessage(wsData, tripHistory.topic, tripHistory);

        // wsData.send(JSON.stringify(tripHistory));
      }

      //Each server will have a unique app id
      console.log("A WebSocket connected with URL: " + ws.url);
    },

    message: async (ws, message, isBinary) => {
      console.log(message);
      let response;
      // //Check the message type or topic

      const newMessage = JSON.parse(message);

      const { userType } = newMessage; //User Type is the type of user this message is going to
      if (userType === "driver") {
        response = await DriverService.handleDriverWsMessages(newMessage);
      } else if (userType === "rider") {
        response = await RiderService.handleRiderWSMessages(newMessage);
      } else return;

      if (response) {
        let ok = sendWsMessage(ws, response.topic, response.data);

        console.log(ok);
      }
    },

    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },

    close: async (ws, code, message) => {
      //Decrease redis  websocket connection count for this server
      const { user } = ws;

      console.log("WebSocket closed");

      // await twemproxyRedis.decr(`${process.env.APP_ID}_WS_COUNT`);
      //Keep track of connected clients Id
      // const { driverId, riderId } = ws.data;
      delete activeConnections[user];

      console.log(activeConnections.size);
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
