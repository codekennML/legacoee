const rideModel = require("../model/rides");

const sharedModel = require("./shared/index");

class RideRepository {
  constructor(model) {
    this.model = model;
  }

  async createRide(rideData, session) {
    return await sharedModel.createDoc(rideData, this.model, session);
  }

  async getRide(request, session, populatedQuery) {
    return await sharedModel.findDocById(
      { id: request.id, select: request?.select },
      this.model,
      session,
      populatedQuery
    );
  }
}

module.exports = new RideRepository(rideModel);
