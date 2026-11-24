/** The request's JSON body, or null when it's missing or not valid JSON. */
export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}
