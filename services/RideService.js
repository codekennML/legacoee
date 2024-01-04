const rideRepo = require("../repository/Ride");
const DirectionsService = require("./DirectionsService");
const polylineUtils = require("../utils/mapUtils/index");
const { pubSubRedis } = require("./3rdParty/redis");

const { retryTransaction } = require("../utils/helpers/retryTransactions");
const sendWsMessage = require("../utils/helpers/sendWsMessage");
const sendPubSub = require("../utils/helpers/sendPub");

const tripsRepository = require("../repository/Trips");
const routeRepository = require("../repository/Route");

const acceptedRidesCache = {};

const clearAcceptedRidesCache = () => {
  acceptedRidesCache.forEach(([key, value]) => {
    const timeNow = new Date().toISOString();

    //Clear out all keys with expiry times
    if (timeNow >= value.expiry) {
      delete acceptedRidesCache[key];
    }
  });
};

setInterval(clearAcceptedRidesCache, 5000);

class RideService {
  constructor(config) {
    this.rideRepository = config;
  }

  async createNewRide(rideData, session) {
    const {
      polylines,
      riderCurrentLocationData,
      riderDestinationData,
      riderId,
    } = rideData;

    const rideInfo = {
      polyline: polylines[0],
      rideData: {
        destination: {
          place_id: riderDestinationData.placeId,
          coordinates: [
            parseInt(riderDestinationData.coordinates.lat),
            parseInt(riderDestinationData.coordinates.lng),
          ],
        },

        start_location: {
          place_id: riderCurrentLocationData.placeId,
          coordinates: [
            parseInt(riderDestinationData.coordinates.lat),
            parseInt(riderDestinationData.coordinates.lng),
          ],
        },
      },
      riderId,
      ongoing: false,
    };

    const ride = await this.rideRepository.createRide(rideInfo, session);

    return ride;
  }

  async getRide(rideInfo, session) {
    return await this.rideRepository.getRide({
      request: {
        id: rideInfo.id,
        select: rideInfo.select,
      },
      session,
      populatedQuery: [
        {
          path: "trip",
          select: "driverId ongoing ",
          populate: {
            path: "driverId",
            select: "avatar firstname lastname",
          },
        },
      ],
    });
  }

  async getOngoingRide(request) {
    return await this.rideRepository.getRides(request);
  }

  async updateRide(request, session) {
    return await this.rideRepository.updateRideInfo(request, session);
  }

  async handleRiderWSMessages(message) {
    const { topic, ws, ...data } = message;

    let response;

    switch (topic) {
      case "send_location_update":
        response = await DirectionsService.handleLocationData(message);
        console.log(data);

        break;

      case "get_ride":
        const {
          seats_needed_count,
          currentLocation,
          destination,
          fee,
          riderId,
          riderPolyline,
          riderH3DestCoords,
        } = JSON.parse(data);

        let pointCellIds = [];

        if (!riderH3DestCoords) {
          const points = await polylineUtils.getPointsAtDistance(
            riderPolyline,
            [0.85, 0.9, 0.95]
          );
          //This gets the cellId of the 85/90/95
          pointCellIds = points.map((point) => {
            return polylineUtils.convertCoordinatesToH3CellId({
              lat: point[0],
              lng: point[1],
            });
          });
          //This adds the 100% point
          pointCellIds.push(mainCellId);
        } else {
          pointCellIds = riderH3DestCoords;
        }

        const mainCellId = await polylineUtils.convertCoordinatesToH3CellId({
          lat: parseInt(currentLocation.lat),
          lng: parseInt(currentLocation.lng),
          level: 9,
        });

        // const mainCellParentId  =  polylineUtils.getParentCellAtUpperLevel(mainCellId)

        //This will be for getting a more granular level
        const ParentCellId = polylineUtils.getParentCell(mainCellId, 8);

        const parentChildren = polylineUtils.getParentChildrenCells(
          ParentCellId,
          9
        );

        const neighbouringCells =
          await polylineUtils.getNeighbouringCellsInDistance(mainCellId, 3);

        //First get all the drivers in the main cellId

        let nearbyDrivers = new Set();

        // const driversInMainCell =  await twemproxyRedis.lrange(mainCellId, 0, -1 )

        //Next , Get drivers within  3km -  This will account for cells that may be in adjacent cells within another parent

        const getDriversinKeys = async (keys) => {
          try {
            // Use multi to queue multiple commands and then exec to execute them atomically
            await twemproxyRedis
              .multi(keys.map((key) => ["lrange", key, 0, -1]))
              .exec((err, replies) => {
                if (err) {
                  console.error("Error fetching lists:", err);
                  return;
                }

                if (replies.length > 0)
                  replies.forEach((reply) => {
                    nearbyDrivers.add(...reply);
                  });
              });
          } catch (error) {
            console.log(error.message);
          }
        };
        //Get drivers in current Cell
        await getDriversinKeys([mainCellId]);

        //  //Get drivers in neighbouring cells , max of 3km away
        //   await getDriversinKeys(neighbouringCells)

        //Get drivers in adjacent cells that are siblings but not in neighbouring ceslls
        const siblingCellsWithoutDuplicates = new Set(
          ...neighbouringCells,
          parentChildren
        );

        await getDriversinKeys(siblingCellsWithoutDuplicates);

        //Now find all drivers with 89-100% match of the riders destination and send a pubsub with the proposed budget

        function canTagAlong(driverData, pointCellIds) {
          const polylineArray =
            polylineUtils.convertPolylineToH3CoveringCellsArray(
              driverData.polyline
            );

          const isSuitable = polylineArray.some(
            (cell) =>
              pointCellIds.includes(cell) &&
              seats_needed_count <= driverData.available_seats
          );

          return isSuitable;
        }

        if (nearbyDrivers.size === 0) {
          //Create no driver found message

          const noDriverMessage = {
            topic: "no_driver_found",
            destH3Cords: pointCellIds,
          };

          ws.send(JSON.stringify(noDriverMessage));
          break; //break from here and return
        }

        let driversToReceiveNotifications = [];

        //N:B parallelize this function - split it evenly amongst available workers and give each worker a portion
        nearbyDrivers.forEach((driver) => {
          const isSuitable = canTagAlong(driver, pointCellIds);

          if (isSuitable) {
            const data = {
              id: driver.driverId,
              serverId: driver.serverId,
              riderServer: process.env.APP_ID,
              messageData: {
                riderId,
                riderBudget: fee,
              },
            };
            driversToReceiveNotifications.push(data);
          }
        });

        if (driversToReceiveNotifications === 0)
          ws.send(JSON.stringify(noDriverMessage));

        //group drivers according to servers so we can send their pubsub once
        const driversGroupedByServers = Object.groupBy(
          nearbyDrivers,
          ({ serverId }) => serverId
        );

        //This introduces a 2s delay before publisshing the next  batch
        const publishToRedis = async (key, value) => {
          return new Promise((resolve, reject) => {
            setTimeout(async () => {
              try {
                const dataToSendOverPub = {
                  topic: "ride_request_bargain",
                  recipients: value,
                };

                const data = await pubsubRedis.publish(
                  `channel:${key}`,
                  JSON.stringify(dataToSendOverPub)
                );
                resolve(data);
              } catch (error) {
                reject(error);
              }
            }, 2000);
          });
        };

        Object.entries(driversGroupedByServers).forEach(
          async ([key, value]) => {
            try {
              const result = await publishToRedis(key, value);
              console.log(result);
            } catch (error) {
              console.error("Error publishing to Redis:", error.message);
            }
          }
        );

        //Create awaiting drivers reply message

        const replyMessage = {
          topic: "awaiting_drivers_reply",
          riderId,
          riderH3DestCoords: pointCellIds,
        };

        ws.send(JSON.stringify(replyMessage));

        break;

      case "location_update":
        break;

      case "accept_ride":
        const { rider, driver } = data;

        //TODO: Rememeber to send the closed status back to the FE for local storage incase some pubs slip by the cache so we can discard them there.

        //Create a redis entry to avoid getting other request
        await pubSubRedis.set(rider?.id, `closed`, `EX`, 300); //5mins expiry

        let value = {
          insertedAt: Date.now(),
        };

        acceptedRidesCache[`${rider.id}`] = value;
        //Store Data in DB

        const new_ride_data = {
          riderId: rider.riderId,
          rideData: rider.rideData,
          ride_fare_estimate: [Number],
          accepted_fare: rider.acc_fare,
          driverId: driver.driverId,
          tripId: driver.tripId,
        };

        const createNewRideTrip = async (session, args) => {
          //Create the ride first
          let result;
          await session.withTransaction(async () => {
            //Create ride first
            const newRide = await this.createNewRide(args, session);

            //Update the trip with the ride data

            result = await tripsRepository.updateTrip({
              id: args.tripId,
              body: {
                $push: {
                  rides: newRide._id,
                },
              },
              misc: {
                session,
                new: true,
                select: "_id",
              },
            });
          });

          await session.commitTransaction();

          return result;
        };

        const createdRide = await retryTransaction(
          createNewRideTrip,
          2,
          new_ride_data
        );

        //Need a transaction here - create the ride and add it to the drivers trip

        if (!createdRide) console.log("Leemao");
        //Send pub to driver server/driver for new tag along
        const driverChannel = `channel:${driver.server}`;

        const message = {
          driver: driver.id,
          tripId: driver.trip,
          rider, // This contains the rider name avatar and metadata
        };

        await pubSubRedis.publishToChannel(driverChannel);

        //new Ride

        break;

      case "cancel_ride_search":
        break;

      case "cancel_pickup":
        //Send the push notification to driver of cancellation

        const { riderInfo, driverInfo } = data;

        //Change status of ride to complete
        const cancelledRide = await this.updateRide({
          id: riderInfo.rideId,
          body: {
            $set: {
              ongoing: false,
              cancelled: {
                status: false,
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

        //Send successful cancellation message ,  then send pubsub to driver server
        sendMessageToUser(ws, topic, data);

        //sendPubsubToXServer

        await sendPubSub(serverId, data);

        // if (!updatedRide.pickedup) {
        //   //Check if the driver is close to the rider , in which case, they probably want to perform an offline ride , so send a warning

        //   const driverPosition = await routeRepository.getRouteData({
        //     query: {
        //       body: {
        //         tripId: { $eq: mongoose.Types.ObjectId(tripId) },
        //       },
        //       select: "route.driverRouteData",
        //     },
        //     session: undefined,
        //     populatedQuery: [],
        //   });

        //   const driverlastCoordinates =
        //     driverPosition.route.driverRouteData.at(-1);
        //   //Get the last location in the array
        //   const distanceBetweenDriverAndRider =
        //     polylineUtils.calculateDistanceBetweenPoints(
        //       {
        //         lat: coordinates.lat,
        //         lng: coordinates.lng,
        //       },
        //       {
        //         lat: driverLastCoordinates[0],
        //         lng: driverlastCoordinates[1],
        //       },
        //       "meters"
        //     );

        //   if (distance < 100) {
        //     const offlieRideWarningMsg = {
        //       topic: "offline_ride_warning",
        //       data: {
        //         message: `Your driver seems really close. If you intend to cancel in order to engage in an offline ride, please be aware that rides that are taken offline are not monitored and could jeopardize your safety`,
        //       },
        //     };

        //     ws.send(JSON.stringify(offlieRideWarningMsg));
        //     break;
        //   }

        //   const noCancellationBillInfo = {
        //     topic: "cancellation_response_nobill",
        //     data: [],
        //   };

        //   ws.send(JSON.stringify(noCancellationBillInfo));
        //   //Just cancel the ride in db
        //   //Cancel ride
        // }

        //Send push notification to driver about cancelled pickup

        //Send pun for cancelled pickup

        break;

      case "end_ride":
        const { rideData, rideId, coordinates, driverData, tripId } = data;

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
              rideId: { $eq: mongoose.Types.ObjectId(rideId) },
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

        //from here just base the bill on the route , so you need to get the route data for this user

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

      case "end_ride":
        break;

      case "":
        break;

      default:
        break;
    }
  }
}

module.exports = new RideService(rideRepo);
