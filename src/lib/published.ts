import data from "../../content/published.json";
import { publicSnapshot } from "./portfolio";

export const published = publicSnapshot(data as Parameters<typeof publicSnapshot>[0]);
