// scripts/supabase_connection.js
const { createClient } = supabase;

window.supabaseClient = createClient(
  "https://qgvotcupxchajbtkydiq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndm90Y3VweGNoYWpidGt5ZGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDk1MjMsImV4cCI6MjA5MTkyNTUyM30.MMVHAJV0OO_byDvhJ_6S7yL9oZR-vPNNDCDHZb2vlp8"
);