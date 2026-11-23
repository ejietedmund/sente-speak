import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DENOMINATIONS } from "../config/denominations";

export function AboutPage({ onHome }: { onHome: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 id="page-heading" className="text-3xl font-extrabold sm:text-4xl">
          About SENTE SPEAK
        </h1>
        <p className="mt-3 text-lg">
          SENTE SPEAK is an assistive tool that helps blind and visually impaired people identify
          Ugandan banknotes independently.
        </p>
      </div>

      <Card labelledBy="about-how-heading">
        <h2 id="about-how-heading" className="text-xl font-bold">
          What it does
        </h2>
        <p className="mt-2">
          You capture or upload a photo of one banknote. A trained MobileNetV2 image model identifies
          the denomination, and the application speaks the result in your chosen language. If the
          result is uncertain, SENTE SPEAK says so instead of guessing.
        </p>
      </Card>

      <Card labelledBy="about-denominations-heading">
        <h2 id="about-denominations-heading" className="text-xl font-bold">
          Supported denominations
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {DENOMINATIONS.map((item) => (
            <li key={item.key} className="rounded-lg border border-line bg-paper px-4 py-2 font-semibold">
              {item.label}
            </li>
          ))}
        </ul>
      </Card>

      <Card tone="warning" labelledBy="about-limits-heading">
        <h2 id="about-limits-heading" className="text-xl font-bold">
          Important limits
        </h2>
        <p className="mt-2">
          This tool identifies denominations. It does not authenticate banknotes and cannot tell
          whether a note is genuine. Always check important transactions by another means.
        </p>
        <p className="mt-2">
          Recognition runs through the SENTE SPEAK backend on the same computer or network. There is
          no browser-only or offline mode in this version.
        </p>
      </Card>

      <Button onClick={onHome}>Return home</Button>
    </div>
  );
}
