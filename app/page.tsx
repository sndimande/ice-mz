import data from "../data/indices.json";
import Portal from "./portal";

export default function Home() {
  return <Portal data={data} />;
}
