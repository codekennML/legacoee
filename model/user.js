const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      trim: true,
      required: [true, "User firstname is required"],
      max: 100,
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

    last_name: {
      type: String,
      trim: true,
      required: [true, "User firstname is required"],
      max: 100,
    },

    birthDate: {
      type: Date,
      required: [true, "User Date of Birth required"],
    },

    phone_number: {
      type: Number,
      max: 10, // +2348105481234
      required: [true, "User Phone number is required"],
    },

    avatar: {
      type: String,
      default: ".......a...s..s.",
      required: [true, "User avatar is required"],
    },

    password: {
      type: String,
      required: function () {
        this.googleId ? false : true;
      },
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
  },
  {
    timestamps: true,

    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
