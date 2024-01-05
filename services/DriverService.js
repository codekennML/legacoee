const DirectionsService = require("./DirectionsService");
const { pubsubRedis } = require("./3rdParty/redis/index");
const TripsRepository = require("../repository/Trips");

const rideAcceptanceStatusCache = {};

//Set interval to clear expired data every 5 mins

setInterval(clearExpiredAcceptanceStatus, 30000);

function clearExpiredAcceptanceStatus() {
  rideAcceptanceStatusCache.forEach(([key, value]) => {
    const timeNow = new Date().toISOString();

    //Clear out all keys with expiry times
    if (timeNow - value.insertedAt >= 30000) {
      delete rideAcceptanceStatusCache[key];
    }
  });
}

class DriverService {
  constructor() {}

  async handleDriverWsMessages(message) {
    const { type } = message;

    let response;

    switch (type) {
      case "has_ongoing_trip":
        //Find an existing trip
        break;

      case "trip_status":
        response = tryCatch(async () => {
          //No ongoing trip definitely
          if (!message?.trip) {
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

            return (result = {
              driverId,
              new_trip: true,
              polylines,
              riderCurrentLocationData,
              riderDestinationData,
              fare,
            });
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

            const result = {
              new_trip: false,
              ...data,
            };

            return result;
          }
        });

        //     // if (result.error) upgradeAborted.aborted = true;

        //     // response = result;

        //     //      response  = { data :  { driverId : result.driverId,
        //     //       polylines : result.driver.polylines,
        //     //       ongoing:result.ongoing,
        //     //       coordinates  : {
        //     //        lat : parseInt(body.coordinates.lat),
        //     //        lng : parseInt(body.coordinates.lng)
        //     //       }

        //     //      }

        //     // }
        //   });
        // }

        break;
      //console.log("Loalao")
      case "location_update":
        //
        response = await DirectionsService.handleLocationData(message);
        console.log(response);

        break;

      // case "ride_price_response":
      //   const { driverPrice, driver, availableSeats, rider_serverId, riderId } =
      //     message;

      //   //Send messafe to server channel of user

      //   const messageData = {
      //     topic,
      //     available_seats: availableSeats,
      //     driver, //Driver id ,  driver avatar and driver names , current_location
      //     riderId,
      //     amount: driverPrice,
      //   };

      //   //First check if the ride has not been assigned to someone else
      //   //CACHE
      //   let rideAcceptedStatus = rideAcceptanceStatusCache[riderId];

      //   if (rideAcceptedStatus) break;
      //   //rRedis
      //   const isAssigned = await pubsubRedis.get(riderId);

      //   if (isAssigned) {
      //     //Cache this incase there is another driver on this server that got the request and wants to send a price too, so we can block it
      //     rideAcceptanceStatusCache[riderId] = {
      //       expiry: Date.now() + 5 * 60 * 60,
      //     };

      //     break;
      //   }

      //   const riderServerChannel = `channel:${rider_serverId}`;

      //   try {
      //     await pubsubRedis.publish(
      //       riderServerChannel,
      //       JSON.stringify(messageData)
      //     );
      //   } catch (error) {
      //     console.log(error);
      //   }

      //   break;

      case "driver_rejects_ride":
        break;

      case "end_ride":
        const { rideData, rideId, coordinates, tripId } = data;

        //Fetch ride from DB
        const rideInfo = await this.getRide({
          id: rideId,
          select: "cancelled ongoing  completed",
        });

        if (
          rideInfo?.cancelled?.status ||
          !rideInfo?.ongoing ||
          rideInfo.completed
        ) {
          //
          const message = {
            topic: "ride_end_fail",
            riderId: rideData.riderId,
          };
          ws.send(JSON.stringify(message));
          break;
        }

        //Change status of ride to complete
        const updatedRide = await this.updateRide({
          id: rideId,
          body: {
            $set: {
              ongoing: false,
              completed: true,
              dropOffTime: Date.now(),
            },
          },
          misc: {
            session,
            new: true,
            select: "rideData pickedUp accepted_fare pickupTime",
          },
        });
        //To determine the fare estimate ,  we will do two things

        //First , assume the ride was completed at the final destination the rider was going to ,

        let billToPay = updatedRide.accepted_fare;
        //Find the global basefare charge from our charges db
        let basefare = 200;
        const getDistanceFare = (distance) => {
          let fare = 0;

          switch (true) {
            case distance >= 60:
              fare = 20;
              break;

            case distance >= 40:
              fare = 25;
              break;

            case distance >= 35:
              fare = 30;
              break;

            case distance >= 25:
              fare = 35;
              break;

            case distance >= 15:
              fare = 40;
              break;

            case distance >= 10:
              fare = 45;
              break;

            case distance >= 5:
              fare = 50;
              break;

            default:
              fare = 60;
              break;
          }

          return fare;
        };

        //TODO  : set this in db for retrieval

        //Calculate distance from start point to this point

        const request = {
          query: {
            body: {
              tripId: { $eq: mongoose.Types.ObjectId(tripId) },
            },
            select: "rideData user accepted_fare route ",
          },
          session: undefined,
          populatedQuery: [],
        };

        const userRouteData = await routeRepository.getRouteData(
          request.query,
          request.session,
          request.populatedQuery
        );

        const { route } = userRouteData;

        const distanceBetweenPoints =
          polylineUtils.calculateDistanceBetweenPoints(
            {
              lat: coordinates.lat,
              lng: coordinates.lng,
            },
            {
              lat: updatedRide.rideData.destination.coordinates[0],
              lng: updatedRide.rideData.destination.cordinates[1],
            },
            "meters"
          );

        //If the distance is more than 1km , then most likely , the user dropped along the way or possibly connived with the driver to take  the trip far beyond their intial drop off location

        let fareMessage = {
          topic: "ride_end_bill",
        };

        if (distanceBetweenPoints > 1000) {
          //Get the route from the osrm route using driver data

          const { driverRouteData } = route;

          //Snap to road and calculate the time taken
          const reconRoute = await polylineUtils.snapToRoads(
            driverRouteData.data,
            driverRouteData.timestamps
          );

          //Convert reconstructedRoute to LineString and measure the distance, then calculate the bill based on time ride started and ended
          const routeLineString =
            polylineUtils.convertCoordinatesToLineString(reconRoute);

          const distanceTravelled = turf.length(routeLineString);

          const fare = getDistanceFare(distanceTravelled);

          const rideTimeInMins =
            (new Date(updatedRide.pickupTime) - new Date()) / (1000 * 60);

          billToPay = basefare + fare * distanceTravelled + 2 * rideTimeInMins;
        }

        fareMessage[data] = {
          message: billToPay,
        };
        ws.send(JSON.stringify(fareMessage));
        break;

      case "driver_cancels_pickup":
        const { rideDataInfo } = message;

        //Send the push notification to rider of cancellation

        const { riderServer, ...rider } = rideDataInfo;
        //Change status of ride to complete
        const cancelledRide = await this.updateRide({
          id: rideDataInfo.rideId,
          body: {
            $set: {
              ongoing: false,
              cancelled: {
                status: true,
                initiatedBy: mongoose.Types.ObjectId(riderInfo.riderId),
                time: Date.now(),
              },
            },
          },
          misc: {
            session,
            new: true,
            select: "rideData pickedUp accepted_fare",
          },
        });

        if (!cancelledRide) console.log("Something went wrong");

        //sendPubsubToXServer
        const pubsubdata = {
          topic: "pickup_cancelled",
          recipient: {
            rider,
          },
        };

        await sendPubSub(pubSubRedis, riderServer, pubsubdata);

        //Send successful cancellation message ,  then send pubsub to rider server
        const wsData = {
          topic: "pickup_cancelled",
          data: {
            riderInfo,
          },
        };
        sendWsMessage(ws, topic, wsData);

        //send notification to rider of cancelled ride

        break;

      default:
        console.log("Holla");
        break;
    }
  }

  async getDriverTrips(request) {
    const trips = await TripsRepository.getTrips(request);

    return trips;
  }
}

module.exports = new DriverService();
