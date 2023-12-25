const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.SchemaTypes.ObjectId,
      required: [true, "riderId is required to create new ride"],
      ref: "User",
    },

    rideData: {
      destination: {
        place_id: String,
        coordinates: {
          type: [Number],
          required: true,
        },
      },
      start_location: {
        place_id: String,
        coordinates: {
          type: [Number],
          required: true,
        },

        polyline: {
          type: String,
          required: true,
        },
      },
    },

    ride_fare_estimate: [Number],

    ongoing: {
      type: Boolean,

      required: [true, "Trip status is required"],
    },

    tripId: {
      type: mongoose.SchemaTypes.ObjectId,
      required: function () {
        return this.ongoing ? true : false;
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Rides = mongoose.model("Ride", rideSchema);

module.exports = Rides;
