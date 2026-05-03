import axios from "axios";
import type { Monitor, CheckResult } from "../monitors/types";
import { buildMessage } from "./format";

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export async function sendTelegram(
  config: Record<string, unknown>,
  monitor: Monitor,
  result: CheckResult
): Promise<void> {
  const { botToken, chatId } = config as TelegramConfig;
  if (!botToken || !chatId) throw new Error("Missing Telegram botToken or chatId");

  const text = buildMessage(monitor, result);
  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  });
}
