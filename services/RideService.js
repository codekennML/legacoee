const riderRepo = require("../repository/Ride");

class RiderService {
  constructor(config) {
    this.riderRepository = config;
  }

  async createNewRide(rideData) {
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

    const ride = await this.riderRepository.createRide(rideInfo);

    return ride;
  }

  async getRide(rideInfo, session) {
    return await this.riderRepository.getRide({
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

  async handleRiderWSMessages(message) {}
}

module.exports = new RiderService(riderRepo);
