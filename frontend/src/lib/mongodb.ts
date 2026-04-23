import dns, { promises as dnsP } from "node:dns";
import ConnectionString from "mongodb-connection-string-url";
import mongoose from "mongoose";

/**
 * `MONGODB_DIRECT_URI` = non-SRV `mongodb://` string from Atlas (or `npx tsx scripts/print-mongo-direct-uri.mts`).
 * Takes precedence over SRV; avoids all `querySrv` failures on Windows.
 */
const MONGODB_BASE =
  process.env.MONGODB_DIRECT_URI?.trim() ||
  process.env.MONGODB_URI?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "";

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: Cached | undefined;
}

const cached: Cached = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

let resolvedDirectUri: string | null = null;
let resolveUriPromise: Promise<string> | null = null;

function encodeUserinfo(s: string) {
  return encodeURIComponent(s);
}

async function effectiveMongoUri(srvOrDirect: string): Promise<string> {
  if (process.env.MONGODB_DIRECT_URI?.trim()) {
    return process.env.MONGODB_DIRECT_URI.trim();
  }
  if (!srvOrDirect.startsWith("mongodb+srv://")) {
    return srvOrDirect;
  }
  if (resolvedDirectUri) {
    return resolvedDirectUri;
  }
  if (!resolveUriPromise) {
    resolveUriPromise = (async () => {
      try {
        dns.setDefaultResultOrder("ipv4first");
        dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1", "9.9.9.9"]);
      } catch {
        /* */
      }
      const c = new ConnectionString(srvOrDirect);
      if (!c.isSRV) {
        return srvOrDirect;
      }
      const seed = c.hosts[0];
      if (!seed) {
        throw new Error("Mongo SRV: missing host in connection string (cannot resolve _mongodb._tcp).");
      }
      const fqdn = `_mongodb._tcp.${seed}`;

      const [txtRecs, srvRecords] = await Promise.all([dnsP.resolveTxt(fqdn), dnsP.resolveSrv(fqdn)]);

      const flatTxt = (txtRecs as string[][]).map((chunks) => chunks.join("")).join("");
      for (const part of flatTxt.split("&")) {
        if (!part) continue;
        const eq = part.indexOf("=");
        if (eq === -1) {
          c.searchParams.set(part, "");
        } else {
          c.searchParams.set(part.slice(0, eq), part.slice(eq + 1));
        }
      }
      if (!c.searchParams.has("tls") && !c.searchParams.has("ssl")) {
        c.searchParams.set("tls", "true");
      }

      const hostStr = [...srvRecords]
        .sort((a, b) => a.priority - b.priority || a.weight - b.weight)
        .map((r) => `${r.name}:${r.port}`)
        .join(",");
      if (!hostStr) {
        throw new Error("Mongo SRV: resolveSrv returned no hosts. Set MONGODB_DIRECT_URI to the standard URI from Atlas.");
      }

      const auth =
        typeof c.username === "string" && c.username
          ? `${encodeUserinfo(c.username)}:${encodeUserinfo(c.password || "")}@`
          : "";
      const pathn = c.pathname && c.pathname.length > 0 ? c.pathname : "/";
      const query = c.searchParams.toString();
      return `mongodb://${auth}${hostStr}${pathn}${query ? `?${query}` : ""}`;
    })();
  }
  const built = await resolveUriPromise;
  if (built.startsWith("mongodb://") && !built.startsWith("mongodb+srv://")) {
    resolvedDirectUri = built;
    return built;
  }
  throw new Error("Mongo: could not build a direct (non-SRV) connection string. Set MONGODB_DIRECT_URI in .env.local.");
}

function mongoErrorHint(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  if (m.includes("querySrv") || m.includes("ECONNREFUSED")) {
    return (
      `${m} Set MONGODB_DIRECT_URI to the "standard" mongodb://… string from MongoDB Atlas (or run ` +
      "npx tsx scripts/print-mongo-direct-uri.mts in the frontend folder), then restart Next."
    );
  }
  return m;
}

export async function connectMongo() {
  if (!MONGODB_BASE) {
    throw new Error("Set MONGODB_DIRECT_URI, MONGODB_URI, or DATABASE_URL");
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = (async () => {
      const base = MONGODB_BASE;
      const uri = base.startsWith("mongodb+srv://") ? await effectiveMongoUri(base) : base;
      if (uri.startsWith("mongodb+srv://")) {
        throw new Error(
          "Mongoose would still use SRV; set MONGODB_DIRECT_URI to a mongodb:// (standard) string from Atlas."
        );
      }
      return mongoose.connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 20_000,
        connectTimeoutMS: 20_000,
        family: 4,
        socketTimeoutMS: 45_000,
      });
    })().catch((err) => {
      cached.promise = null;
      resolveUriPromise = null;
      resolvedDirectUri = null;
      throw new Error(mongoErrorHint(err));
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(mongoErrorHint(e));
  }
  return cached.conn;
}

