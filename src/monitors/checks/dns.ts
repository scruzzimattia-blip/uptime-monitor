import * as dns from "dns";
import { promisify } from "util";
import type { Monitor, CheckResult } from "../types";

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);

export async function checkDns(monitor: Monitor): Promise<CheckResult> {
  const hostname = monitor.url.replace(/^dns:\/\//i, "");
  const resolveType = (monitor.dnsResolveType ?? "A").toUpperCase();
  const start = Date.now();

  try {
    let records: unknown;

    if (monitor.dnsResolveServer) {
      dns.setServers([monitor.dnsResolveServer]);
    }

    switch (resolveType) {
      case "A":
        records = await resolve4(hostname);
        break;
      case "AAAA":
        records = await resolve6(hostname);
        break;
      case "MX":
        records = await resolveMx(hostname);
        break;
      case "CNAME":
        records = await resolveCname(hostname);
        break;
      case "TXT":
        records = await resolveTxt(hostname);
        break;
      default:
        records = await resolve4(hostname);
    }

    const ping = Date.now() - start;
    return {
      status: 1,
      ping,
      msg: `DNS ${resolveType} resolved: ${JSON.stringify(records).slice(0, 100)}`,
    };
  } catch (err) {
    const ping = Date.now() - start;
    const message = err instanceof Error ? err.message : "DNS lookup failed";
    return { status: 0, ping, msg: message };
  }
}
