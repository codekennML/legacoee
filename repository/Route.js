const routeModel = require("../model/route");
const sharedModel = require("./shared/index");

class RouteRepository {
  constructor(model) {
    this.route = model;
  }

  async getRouteData(request, session, populatedQuery) {
    return await sharedModel.findOneDoc(
      request,
      this.route,
      session,
      populatedQuery
    );
  }
}

module.exports = new RouteRepository(routeModel);
