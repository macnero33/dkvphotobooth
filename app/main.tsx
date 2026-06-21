import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./root";
import { routes } from "./routes";
import "./app.css";

// Build the route tree by composing Root as the layout with our nested routes.
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: routes,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
