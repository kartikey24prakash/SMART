import User from "../model/User.js";

const DEFAULT_ADMIN = {
  name: process.env.BOOTSTRAP_ADMIN_NAME || "Super Admin",
  email: process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@smartevent.local",
  password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin@123",
  gender: process.env.BOOTSTRAP_ADMIN_GENDER || "other",
  institution: process.env.BOOTSTRAP_ADMIN_INSTITUTION || "System",
  contactNumber: process.env.BOOTSTRAP_ADMIN_CONTACT || "0000000000",
};

const ensureBootstrapAdmin = async () => {
  const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN.email });

  if (existingAdmin) {
    console.log(`Bootstrap admin ready: ${DEFAULT_ADMIN.email}`);
    return existingAdmin;
  }

  const admin = await User.create({
    ...DEFAULT_ADMIN,
    role: "admin",
  });

  console.log(`Bootstrap admin created: ${DEFAULT_ADMIN.email}`);
  return admin;
};

export default ensureBootstrapAdmin;
