const mongoose = require("mongoose");

//This Schema will be for both ride updates and driver updates

const routeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: "User",
    },

    trip_id: {
      type: mongoose.SchemaTypes.ObjectId,
      required: function () {
        return this?.ride_id ? false : true;
      },
      ref: "Trip",
    },

    ride_id: {
      type: mongoose.SchemaTypes.ObjectId,
      required: false,
      ref: "ride",
    },

    route: {
      driverRouteData: {
        data: {
          type: [number],
        },
        timestamps: {
          type: [number],
        },
      }, //We are keeping this to track both driver location and rider location especially in cases where ride was ordered for the rider by another person

      riderRouteData: {
        data: {
          type: [number],
        },
        timestamps: {
          type: [number],
        },
      },
    },
  },

  {
    timestamps: true,
    versionKey: false,
  }
);

const Route = mongoose.model("Route", routeSchema);

module.exports = Route;
