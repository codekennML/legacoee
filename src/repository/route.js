const Route = require("../model/route")
const  DBLayer = require("./index")


class RouteRepository {


  constructor(model) {
    this.RouteDBLayer = new DBLayer(model);
  }

  async createRoute(
    request,
    session
  ) {
    let createdRoutes  = [];

    createdRoutes = await this.RouteDBLayer.createDocs([request], session);

    return createdRoutes;
  }

  async returnPaginatedRoutes(request) {
    const paginatedRoutes = await this.RouteDBLayer.paginateData(request);

    return paginatedRoutes;
  }

  async findRouteById(request) {
    const Route = await this.RouteDBLayer.findDocById(request);
    return Route;
  }

  async findRoutes(request) {
    const RouteData = await this.RouteDBLayer.findDocs(request);
    return RouteData;
  }

  async updateRoute(request) {
    const updatedRoute = await this.RouteDBLayer.updateDoc({
      docToUpdate: request.docToUpdate,
      updateData: request.updateData,
      options: request.options,
    });

    return updatedRoute;
  }

  async updateManyRoutes(request) {
    const result = await this.RouteDBLayer.updateManyDocs(request);

    return result;
  }

  async bulkUpdateRoute(request) {
    const result = await this.RouteDBLayer.bulkWriteDocs(request);

    return result;
  }

  async deleteRoutes(request) {
    return this.RouteDBLayer.deleteDocs(request);
  }
}

const RouteDataLayer = new RouteRepository(Route);
module.exports =   RouteDataLayer


