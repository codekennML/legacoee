const { Schema, model, SchemaTypes } = require("mongoose");

const MessageSchema = new Schema(
  {
    chatId: {
      type: SchemaTypes.ObjectId,
      ref: "Chat",
    },

    sentBy: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: "User",
    },

    deliveredAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Message = model(
  "Message",
  MessageSchema
);

module.exports =  Message
