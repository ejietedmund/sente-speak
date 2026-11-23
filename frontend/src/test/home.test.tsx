import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomePage } from "../pages/HomePage";

const health = {
  status: "ok" as const,
  version: "1.0.0",
  model: {
    available: true,
    architecture: "MobileNetV2",
    input_size: 224,
    class_count: 6,
    model_file: "sente_speak_float32.tflite",
    source: "backend/models",
    color_order: "RGB",
    preprocessing: "mobilenet_v2.preprocess_input",
  },
  policy: { min_confidence: 0.6, min_margin: 0.2, description: "Test policy" },
  message: "",
};

describe("home screen accessibility", () => {
  it("exposes labelled primary actions and a speech language control", () => {
    render(
      <HomePage
        health={health}
        healthErrorMessage={null}
        language="en"
        speechLabel="Speech: on · English"
        speechMessage="Results will be spoken."
        onLanguageChange={() => undefined}
        onScan={() => undefined}
        onUpload={() => undefined}
        onSettings={() => undefined}
        onRefreshHealth={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Identify a banknote");
    expect(screen.getByRole("button", { name: /scan banknote/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /upload image/i })).toBeEnabled();
    expect(screen.getByLabelText("Speech language")).toHaveValue("en");
    expect(screen.getByText(/press tab to move between controls/i)).toBeInTheDocument();
  });
});
