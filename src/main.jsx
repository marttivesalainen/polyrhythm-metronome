import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PolyrhythmTrainer from "./polyrhythm-metronome.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PolyrhythmTrainer />
  </StrictMode>
);
