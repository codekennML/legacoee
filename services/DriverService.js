const DirectionsService = require("./DirectionsService");
const { pubsubRedis } = require("./3rdParty/redis/index");
const TripsRepository =  require("../repository/Trips")
class DriverService {
  constructor() {}

  async handleDriverWsMessages(message) {
    const { type } = message;

    let response;

    switch (type) {

      case "has_ongoing_trip" : 
       //Find an existing trip
      break 

      case "trip_status" : 
        
     
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
          })

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

      break 
      //console.log("Loalao")
      case "location_update":
        //
        response = await DirectionsService.handleLocationData(ws, message);
        console.log(response);

        break;
  
      case "ride_price_response":
        const {
          driverPrice,
          driverId,
          availableSeats,
          rider_serverId,
          riderId,
        } = message;

        //Send messafe to server channel of user

        const messageData = {
          available_seats: availableSeats,
          driverId,
          riderId,
          amount: driverPrice,
        };

        const riderServerChannel = `channel:${rider_serverId}`;

        try {
          await pubsubRedis.publish(
            riderServerChannel,
            JSON.stringify(messageData)
          );
        } catch (error) {
          console.log(error);
        }

        break;

      case "driver_accepts_ride":
        const { amount, riderData, serverId, driverData } = message;

        //   const userArray  = await UserService.findUsersData({ body : { id : mongoose.Types.ObjectId    (riderId)},
        //   select : "avatar first_name last_name phone_number"
        // })
        //  if (userArray.length < 0 ) {

        //  }

        const newRequest = {
          amount,
          riderData,
          serverId,
        };

        const driverws = activeConnections.get(driverId);

        driverws.send(newRequest);

        break;

      case "driver_rejects_ride":
        break;

      case "driver_cancels_ride":
        break;

      case "rider_cancels_ride":
        break;

      default:
        console.log("Holla");
        break;
    }
  }

  async getDriverTrips(request) {
    
  const trips = await TripsRepository.getTrips(request) 

  return trips 
  }
}

module.exports = new DriverService();
