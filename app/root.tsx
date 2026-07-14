import { Outlet } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./app.css";

export default function Root() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>DKV Photobooth</title>
      </head>
      <body>
        <Outlet />
        <Analytics />
      </body>
    </html>
  );
}
