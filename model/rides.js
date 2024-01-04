const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.SchemaTypes.ObjectId,
      required: [true, "riderId is required to create new ride"],
      ref: "User",
    },

    pickedUp: {
      type: Boolean,
      required: true,
      default: false,
    },

    pickupTime: {
      type: Date,
      required: function () {
        return this.pickedUp ? true : false;
      },
    },

    droppedOffLocation: {
      type: Boolean,
      required: true,
      default: false,
    },

    dropOffTime: {
      type: Date,
      required: function () {
        return this.droppedOff ? true : false;
      },
    },

    cancelled: {
      status: {
        type: Boolean,
        required: true,
        default: false,
      },

      initiatedBy: {
        type: mongoose.SchemaTypes.ObjectId,
        required: [
          true,
          "Cancellation  initiator is required to create new ride",
        ],
        ref: "User",
      },

      time: Date,
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
      },
      polyline: {
        type: String,
        required: true,
      },

      lineString: {
        type: String,
        required: true,
      },

      rideTotalDistance: {
        type: Number,
        default: 0,
      },
    },

    ride_fare_estimate: [Number],

    accepted_fare: {
      type: Number,
      default: 0,
      required: function () {
        return this.tripId ? true : false;
      },
    },

    ongoing: {
      type: Boolean,
      required: [true, "Trip status is required"],
      default: false,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    route: {
      type: mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: "Route",
    },

    driverId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
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
