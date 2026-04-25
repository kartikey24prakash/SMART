import app from "./src/app.js";
import dotenv from "dotenv";

import connectDB from "./src/config/db.js";
import ensureBootstrapAdmin from "./src/utils/bootstrapAdmin.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await ensureBootstrapAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
