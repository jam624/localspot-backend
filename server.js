import express from "express";
import dotenv from "dotenv";
import cors from "cors";

const app = express();
dotenv.config();

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/health", (req, res) => {
  try {
    res.status(200).json({
      message: "system check good",
    });
  } catch (error) {
    throw error.message;
  }
});

app.listen(PORT, () => {
  console.log(`app is listening port http://localhost${PORT}`);
});
