import { describe, expect, it, vi } from "vitest";
import { ApiError, fetchHealth, recognizeImage } from "../config/api";

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

describe("API client", () => {
  it("posts the selected image to /api/recognize", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({ status: "recognized", denomination: "UGX 10,000" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["image"], "note.png", { type: "image/png" });

    const result = await recognizeImage(file);

    expect(result.status).toBe("recognized");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/recognize");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    vi.unstubAllGlobals();
  });

  it("turns structured backend errors into actionable ApiError objects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "unsupported_format",
              message: "Only JPG, JPEG and PNG images are supported.",
              hint: "Choose another file.",
              retryable: true,
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(fetchHealth()).rejects.toMatchObject({
      code: "unsupported_format",
      hint: "Choose another file.",
      retryable: true,
      status: 400,
    });
    vi.unstubAllGlobals();
  });

  it("reports network failures clearly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchHealth()).rejects.toBeInstanceOf(ApiError);
    await expect(fetchHealth()).rejects.toMatchObject({ code: "network_unavailable" });
    vi.unstubAllGlobals();
  });
});
