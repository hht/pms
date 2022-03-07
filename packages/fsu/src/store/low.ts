import { LowSync, JSONFileSync } from "lowdb";
import lodash from "lodash";

type Post = {
  id: number;
  title: string;
};

type Data = {
  posts: Post[];
};

class LowWithLodash<T> extends LowSync<T> {
  chain: lodash.ExpChain<this["data"]> = lodash.chain(this).get("data");
}

const adapter = new JSONFileSync<Data>("db.json");
export const db = new LowWithLodash(adapter);

const post = db.chain.get("posts").find({ id: 1 }).value(); // Important: value() must be called to execute chain
