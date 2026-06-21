export default function handler(request) {
  return new Response(
    JSON.stringify({
      message: "Hello from Vercel Functions!",
      method: request.method,
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      envKeys: Object.keys(process.env).length,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
