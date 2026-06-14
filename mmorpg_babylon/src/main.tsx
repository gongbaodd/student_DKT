import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

// StrictMode double-mounts effects, which breaks Becsy (one world per component registry).
createRoot(document.getElementById("root")!).render(<App />);
