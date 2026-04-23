/**
 * Real Anthropic keys are long and use the `sk-ant-` prefix. Placeholder values
 * in `.env` (e.g. "replace-me") would otherwise pass a naive length check and
 * cause 401s from the Anthropic API.
 */
export function isUsableAnthropicApiKey(value: string | undefined): boolean {
  const k = String(value || "").trim();
  if (k.length < 24) {
    return false;
  }
  if (!k.startsWith("sk-ant-")) {
    return false;
  }
  if (/replace|changeme|placeholder|your[-_]?key|xxx+$/i.test(k)) {
    return false;
  }
  return true;
}
