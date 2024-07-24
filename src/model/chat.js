const { Schema, model, SchemaTypes } = require("mongoose");

const ChatSchema = new Schema(
  {
    latestMessage: {
      type: SchemaTypes.ObjectId,
      ref: "Message",
    },

    status: {
      type: String,
      enum: ["completed", "open"],
      required: true,
    },

    tripId: {
      type: SchemaTypes.ObjectId,
      ref: "Trip",

    },

    rideId: {
      type: SchemaTypes.ObjectId,
      ref: "Ride",
      index: 1,
      required: true
    },

    users: [
      {
        type: SchemaTypes.ObjectId,
        required: true,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ChatSchema.index({
  tripId: 1,
  rideId: 1,
  status: 1,
});

const Chat = model("Chat", ChatSchema);

module.exports = Chat
