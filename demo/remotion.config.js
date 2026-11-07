import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/index.jsx");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(16);
