import type { RouteObject } from "react-router-dom";
import Index from "./routes/_index";
import MeasureFrames from "./routes/measure-frames";
import Photo from "./routes/photo.$id";

// These routes are mounted as children of the Root layout in main.tsx.
// Note: api.cleanup is a server-side route and is NOT included here because
// it uses Node.js-only APIs (process.env) that cannot run in the browser.
export const routes: RouteObject[] = [
  { index: true, element: <Index /> },
  { path: "measure-frames", element: <MeasureFrames /> },
  { path: "photo/:id", element: <Photo /> },
];
