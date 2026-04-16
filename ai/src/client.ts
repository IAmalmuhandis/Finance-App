import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export type Provider = "openai" | "anthropic";

function provider(): Provider {
  const p = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  return p === "anthropic" ? "anthropic" : "openai";
}

export async function generateMarkdown(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  if (provider() === "anthropic") return anthropicText(args);
  return openaiText(args);
}

export async function generateJson<T>(args: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<T> {
  const raw = await generateMarkdown({ system: args.system, user: args.user, temperature: args.temperature });
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  const jsonText = first >= 0 && last > first ? raw.slice(first, last + 1) : raw;
  const parsed = JSON.parse(jsonText);
  return args.schema.parse(parsed);
}

async function openaiText(args: { system: string; user: string; temperature?: number }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const resp = await client.responses.create({
    model,
    temperature: args.temperature ?? 0.2,
    input: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  });

  return resp.output_text ?? "";
}

async function anthropicText(args: { system: string; user: string; temperature?: number }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-3-7-sonnet-latest";

  const resp = await client.messages.create({
    model,
    temperature: args.temperature ?? 0.2,
    max_tokens: 1200,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  });

  const text = resp.content?.map((c) => ("text" in c ? c.text : "")).join("") ?? "";
  return text;
}

