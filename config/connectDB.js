const mongoose = require("mongoose");
require("dotenv").config();

let retries = 0;

const connectDBWithRetry = async () => {
  const delay = Math.pow(2, retries) * 1000; // Exponential backoff

  try {
    await mongoose.connect(process.env.DATABASE_URI, {
      useUnifiedTopology: false,
      useNewUrlParser: true,
    });

    mongoose.connection.once("open", () => {
      console.log("Connection Success");
    });
  } catch (error) {
    if (retries < 3) {
      console.log(`Retrying connection in ${delay / 1000} seconds...`);
      retries++;
      setTimeout(connectDBWithRetry, delay);
    } else {
      throw new Error("Failed to connect to MongoDB after multiple retries");
    }
  }

  // console.log("MongoDB connected successfully!");
};

async function startDB() {
  try {
    await connectDBWithRetry();
  } catch (error) {
    console.log(error.message);
  }
}

module.exports = startDB;
