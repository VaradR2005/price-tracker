const express = require("express");
const cors = require("cors");
require("dotenv").config();
const trackedProductRoutes = require("./routes/trackedProductRoutes");
const scrapeRoutes = require("./routes/scrapeRoutes");
const scrapeQueryRoutes = require("./routes/scrapeQueryRoutes");
const csvRoutes = require("./routes/csvRoutes");
const schedulerRoutes = require("./routes/schedulerRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Price Tracker backend is running",
  });
});

const PORT = process.env.PORT || 5000;

app.use("/api/tracked-products", trackedProductRoutes);
app.use("/api", scrapeRoutes);
app.use("/api", scrapeQueryRoutes);
app.use("/api", csvRoutes);
app.use("/api", schedulerRoutes);
app.use("/api/products", catalogRoutes);
app.listen(PORT, () => {
  console.log(`Price Tracker backend running on port ${PORT}`);
});