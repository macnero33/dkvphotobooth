import { Outlet } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./app.css";

export default function Root() {
  return (
    <>
      <Outlet />
      <Analytics />
    </>
  );
}
