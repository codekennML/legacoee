const mongoose = require("mongoose")
const DATABASE_URI = process.env.DATABASE_URI
let retries = 0;

console.log("sOMEEMME", DATABASE_URI)

const connectDBWithRetry = async () => {
  const delay = Math.pow(2, retries) * 1000; // Exponential backoff

  try {
    await mongoose.connect(DATABASE_URI);

    mongoose.connection.once("open", () => {
      console.log("Connection Success");
    });

    console.log("MongoDB connected successfully!");
  } catch (error) {
    if (retries < 3) {
      console.log(`Retrying DB connection in ${delay / 1000} seconds...`);
      retries++;
      setTimeout(connectDBWithRetry, delay);
    } else {
      throw new Error("Failed to connect to MongoDB after multiple retries");
    }
  }
};

async function startDB() {
  try {
    console.log("Connecting")
    await connectDBWithRetry();
  } catch (error) {
    console.log(error.message);
  }
}

module.exports = startDB
