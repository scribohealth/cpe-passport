export async function request<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = (await response.json()) as T & {
    error?: string | { message?: string };
    message?: string;
  };
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : data.error?.message ||
            data.message ||
            "The request could not be completed.",
    );
  return data;
}
export const json = (method: string, value: unknown): RequestInit => ({
  method,
  body: JSON.stringify(value),
});
