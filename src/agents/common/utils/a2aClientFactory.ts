import { A2AClient } from "@a2a-js/sdk/client";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export const DEFAULT_A2A_TIMEOUT_MS = 30 * 60 * 1000;

function toAbortError(): Error {
  if (typeof DOMException === "function") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const abortError = new Error("The operation was aborted.");
  abortError.name = "AbortError";
  return abortError;
}

function mergeHeaders(...headersList: Array<HeadersInit | undefined>): Record<string, string> {
  const mergedHeaders: Record<string, string> = {};

  for (const headers of headersList) {
    if (!headers) {
      continue;
    }

    const headersObject = new Headers(headers);
    headersObject.forEach((value, key) => {
      mergedHeaders[key] = value;
    });
  }

  return mergedHeaders;
}

function createTimeoutRequest(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const requestUrl =
      typeof input === "string" || input instanceof URL
        ? new URL(input.toString())
        : new URL(input.url);
    const method =
      init?.method ??
      (typeof input === "string" || input instanceof URL ? "GET" : input.method);
    const headers = mergeHeaders(
      typeof input === "string" || input instanceof URL ? undefined : input.headers,
      init?.headers,
    );
    const body = init?.body;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const abortError = toAbortError();

    const originalSignal = init?.signal;
    if (originalSignal) {
      if (originalSignal.aborted) {
        controller.abort(originalSignal.reason);
      } else {
        originalSignal.addEventListener(
          "abort",
          () => controller.abort(originalSignal.reason),
          { once: true },
        );
      }
    }

    try {
      return await new Promise<Response>((resolve, reject) => {
        let settled = false;
        const transport = requestUrl.protocol === "https:" ? httpsRequest : httpRequest;

        const request = transport(
          requestUrl,
          {
            method,
            headers,
          },
          (response) => {
            const chunks: Buffer[] = [];

            response.on("data", (chunk: Buffer | string) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });

            response.on("end", () => {
              if (settled) {
                return;
              }

              settled = true;

              const responseHeaders = new Headers();
              for (const [key, value] of Object.entries(response.headers)) {
                if (Array.isArray(value)) {
                  for (const item of value) {
                    responseHeaders.append(key, item);
                  }
                } else if (typeof value === "string") {
                  responseHeaders.set(key, value);
                }
              }

              resolve(
                new Response(Buffer.concat(chunks), {
                  status: response.statusCode ?? 200,
                  statusText: response.statusMessage ?? "",
                  headers: responseHeaders,
                }),
              );
            });

            response.on("error", (error) => {
              if (settled) {
                return;
              }

              settled = true;
              reject(error);
            });
          },
        );

        const abortRequest = () => {
          if (settled) {
            return;
          }

          settled = true;
          request.destroy(abortError);
          reject(abortError);
        };

        controller.signal.addEventListener("abort", abortRequest, { once: true });

        request.on("error", (error) => {
          if (settled) {
            return;
          }

          settled = true;
          reject(error);
        });

        if (body !== undefined && body !== null) {
          if (typeof body === "string" || Buffer.isBuffer(body) || body instanceof Uint8Array) {
            request.write(body);
          } else {
            request.write(String(body));
          }
        }

        request.end();
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

export function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return createTimeoutRequest(timeoutMs);
}

export async function createA2AClientWithTimeout(
  agentCardUrl: string,
  timeoutMs: number = DEFAULT_A2A_TIMEOUT_MS,
): Promise<A2AClient> {
  return A2AClient.fromCardUrl(agentCardUrl, {
    fetchImpl: createTimeoutFetch(timeoutMs),
  });
}