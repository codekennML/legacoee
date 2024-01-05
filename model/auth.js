const mongoose = require("mongoose");
const { Schema } = mongoose;

const authSchema = new Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
    },

    firstname: {
      type: String,
      max: 50,
      required: true,
    },

    lastname: {
      type: String,
      max: 50,
      required: true,
    },

    email: {
      type: String,
      unique: true,
      max: 255,
      required: true,
      trim: true,
    },

    googleId: {
      type: String,
    },

    avatar: {
      type: String,
    },

    roles: {
      type: [String],
      enum: ["Admin", "Guest", "Customer", "Tasker", "Manager"],
      default: ["Tasker"],
    },

    password: {
      type: String,
      required: function () {
        this.googleId ? false : true;
      },
    },

    phone: {
      type: String,
      max: 15,
      trim: true,
      required: true,
    },

    verifyHash: {
      type: String,
      required: true,
    },

    verified: { type: Boolean, default: false },

    active: {
      type: Boolean,
      default: false,
    },

    suspended: {
      type: Boolean,
      default: false,
    },
    reffererId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

authSchema.index({
  email: 1,
  active: 1,
  username: 1,
  roles: 1,
  reffererId: 1,
  userId: 1,
  verifyHash: 1,
});

const Auth = mongoose.model("Auth", authSchema);

module.exports = Auth;
