const mongoose = require("mongoose");
const dns = require("dns");

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore if not permitted
}

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const localUri = "mongodb://127.0.0.1:27017/community_hero";

  if (primaryUri) {
    try {
      console.log(`Connecting to MongoDB primary URI...`);
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log(`MongoDB Connected (Primary): ${conn.connection.host}`);
      return conn;
    } catch (primaryErr) {
      console.warn(`Primary MongoDB URI connection failed (${primaryErr.message}). Attempting local MongoDB fallback...`);
    }
  }

  try {
    const conn = await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`MongoDB Connected (Local Fallback): ${conn.connection.host}`);
    return conn;
  } catch (localErr) {
    console.error(`Error connecting to MongoDB: ${localErr.message}`);
  }
};

module.exports = connectDB;
