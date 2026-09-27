const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is missing from environment variables");
}

if (!supabaseSecretKey) {
  throw new Error("SUPABASE_SECRET_KEY is missing from environment variables");
}

const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey
);

module.exports = {
  supabase,
};