const { handlePostRequest } = require("../responsehandler");
const driverService = require("../services/DriverService");

class DriverController {
  constructor(service) {
    this.service = service;
  }

  async getOngoingDriverTrip(res, req) {
    const { driverId } = await handlePostRequest(res, req);

    const ongoingTrip = await this.service.getDriverTrips({
      query: {
        driverId,
        ongoing: { $eq: true },
      },
      aggregateData: [
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: "users",
            local_field: "driverId",
            foreign_field: "_id",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  firstname: 1,
                  lastname: 1,
                  avatar: 1,
                },
              },
            ],
            as: "driver",
          },
        },
        { $unwind: "$driver" },
      ],
    });

    if (ongoingTrip.length === 0) return { status: 400, data: ongoingTrip };

    return { status: 200, data: ongoingTrip };
  }
}

module.exports = new DriverController(driverService);
