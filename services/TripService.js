const TripsRepository = require("../repository/Trips");

class TripService {
  constructor(repo) {
    this.repository = repo;
  }

  async createTrip(tripData) {
    return await this.repository.createTrip(tripData);
  }

  async getTripData(tripId) {
    const trip = await this.repository.getTripInfo(tripId);

    return trip;
  }
}

module.exports = new TripService(TripsRepository);
