import nodemailer from "nodemailer";
import type { Monitor, CheckResult } from "../monitors/types";
import { buildMessage } from "./format";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from: string;
  to: string;
}

export async function sendEmail(
  config: Record<string, unknown>,
  monitor: Monitor,
  result: CheckResult
): Promise<void> {
  const { host, port, secure, username, password, from, to } = config as unknown as EmailConfig;
  if (!host || !to) throw new Error("Missing required email config: host, to");

  const transporter = nodemailer.createTransport({
    host,
    port: port ?? 587,
    secure: secure ?? false,
    auth: username ? { user: username, pass: password } : undefined,
  });

  const statusText = result.status === 1 ? "UP" : "DOWN";
  const subject = `[${statusText}] ${monitor.name} is ${statusText}`;
  const text = buildMessage(monitor, result);

  await transporter.sendMail({ from: from ?? username, to, subject, text });
}
