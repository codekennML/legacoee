const routeRepository = require("../repository/Route");

class RouteService {
  constructor(routeRepository) {
    this.routeRepository = routeRepository;
  }

  async getRouteData(request) {
    return await this.routeRepository.getRouteData(
      request?.query,
      request?.session,
      request?.populatedQuery
    );
  }
}

module.exports = new RouteService(routeRepository);
