import app from "./app.js";
import { checkDatabaseConnection } from "./config/db.js";

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET must be configured in production");
    }
    await checkDatabaseConnection();

    app.listen(PORT, () => {
      console.log(
        `Server running on port http://localhost:${PORT}`,
        `swagger is listening on http://localhost:${PORT}/api/docs/`,
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
