import dotenv from "dotenv";

import app from "./app.js";
import { checkDatabaseConnection } from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    await checkDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
}

startServer();
