import { Outlet } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./app.css";

export default function Root() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Outlet />
      <Analytics />
    </div>
  );
}
