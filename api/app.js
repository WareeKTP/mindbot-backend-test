import express from "express";
import bodyParser from "body-parser";
import { pool } from "./db.js";

const app = express();
app.use(bodyParser.json());

// Healthcheck
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// TODO: implement POST /reservations
app.post("/reservations", async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

app.listen(3000, () => console.log("API running on http://localhost:3000"));
