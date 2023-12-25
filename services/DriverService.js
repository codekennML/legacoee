const DirectionsService = require("./DirectionsService");
const { pubsubRedis } = require("./3rdParty/redis/index");

class DriverService {
  constructor() {}

  async handleDriverWsMessages(message) {
    const { type } = message;

    let response;

    switch (type) {
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
}

module.exports = new DriverService();
