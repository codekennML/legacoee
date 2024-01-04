const mongoose = require("mongoose");
const TripModel = require("../model/trip");
const sharedModel = require("./shared/index");

class TripsRepository {
  constructor(model) {
    this.model = model;
  }

  async createTrip(tripData, session) {
    const {
      driverId,
      ongoing = true,
      polylines,
      riderCurrentLocationData,
      riderDestinationData,
    } = tripData;

    const request = {
      driverId: mongoose.Types.ObjectId(driverId),

      tripLocations: {
        start: {
          coordinates: [
            parseInt(riderCurrentLocationData.coordinates.lat),
            parseInt(riderCurrentLocationData.coordinates.lng),
          ],
          name: riderCurrentLocationData.name,
          placeId: riderCurrentLocationData.placeId,
        },
        end: {
          coordinates: [
            parseInt(riderDestinationData.coordinates.lat),
            parseInt(riderDestinationData.coordinates.lng),
          ],
          name: riderDestinationData.name,
          placeId: riderDestinationData.placeId,
        },
      },
      polylines,
      ongoing,
    };

    return await sharedModel.createDoc(request, this.model, session);
  }

  async getTripInfo(tripId) {
    const tripInfo = await sharedModel.findDocById(
      {
        id: mongoose.Types.ObjectId(tripInfo.id),
        select: "driverId tripLocations ongoing rides",
      },
      this.model,
      null,
      [
        {
          path: "driverId",
          select: "avatar firstName lastName Car Seats",
        },
      ]
    );

    return tripData;
  }

  async getTrips(request) {
    return await sharedModel.returnPaginatedDocs(request, this.model);
  }

  async updateTrip(request) {
    return await sharedModel.updateDoc(request, this.model);
  }
}

module.exports = new TripsRepository(TripModel);
