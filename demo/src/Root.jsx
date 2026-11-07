import { Composition } from "remotion";
import { Demo, FPS, TOTAL_FRAMES } from "./Demo.jsx";

export const Root = () => (
  <Composition
    id="RevenueOpsDemo"
    component={Demo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
