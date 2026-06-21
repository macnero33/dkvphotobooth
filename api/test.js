module.exports = function handler(request, response) {
  response.status(200).json({
    message: "Hello from Vercel Functions!",
    method: request.method,
    hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    envKeys: Object.keys(process.env).length,
    runtime: "node",
  });
};
