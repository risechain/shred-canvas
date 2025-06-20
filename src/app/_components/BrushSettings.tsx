import { Button, Separator } from "@/components/ui";
import { usePage } from "@/hooks/usePage";
import { PRESET_COLORS } from "@/lib/constants";
import { HexColorInput, HexColorPicker } from "react-colorful";

export function BrushSettings() {
  const { brushColor, setBrushColor, rgbValues, setRgbValues, brushSize } =
    usePage();

  function convertHexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    setRgbValues({ r, g, b });
  }

  // Handle RGB input changes
  function handleRgbChange(color: string, value: number) {
    const newRgb = { ...rgbValues, [color]: value };
    setRgbValues(newRgb);

    // Convert RGB to hex
    const rgbToHex = (r: number, g: number, b: number) => {
      return (
        "#" +
        [r, g, b]
          .map((x) => {
            const hex = Math.max(0, Math.min(255, x)).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
          })
          .join("")
      );
    };

    setBrushColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  }

  function handleHexChange(hex: string) {
    setBrushColor(hex);

    // convert hex to rgb
    convertHexToRgb(hex);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-md md:text-lg text-text-accent">Brush Settings</p>
      <div className="flex flex-wrap gap-3 items-center">
        <div
          className="w-16 h-16 rounded-sm"
          style={{ backgroundColor: brushColor }}
        />
        <div className="">
          <div className="flex gap-2">
            <p className="text-sm md:text-md text-text-accent">Size:</p>
            <p className="text-sm md:text-md">{brushSize}px</p>
          </div>
          <div className="flex gap-2">
            <p className="text-sm md:text-md text-text-accent">HEX:</p>
            <p className="text-sm md:text-md">{brushColor}</p>
          </div>
          <div className="flex gap-2">
            <p className="text-sm md:text-md text-text-accent">RGB:</p>
            <p className="text-sm md:text-md">
              {rgbValues.r}, {rgbValues.g}, {rgbValues.b}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap gap-2 bg-accent items-center justify-center p-2 rounded-md">
        <HexColorPicker
          color={brushColor}
          onChange={handleHexChange}
          style={{ width: "100%", height: "280px" }}
        />
        {PRESET_COLORS.map((presetColor) => {
          return (
            <Button
              data-selected={presetColor === brushColor}
              variant="ghost"
              key={presetColor}
              className="rounded border border-border-accent/25 w-6 h-6 p-0 hover:scale-125 transition-all data-[selected=true]:border-foreground data-[selected=true]:scale-125"
              style={{ backgroundColor: presetColor }}
              onClick={() => handleHexChange(presetColor)}
            />
          );
        })}
      </div>

      <HexColorInput
        prefixed
        color={brushColor}
        onChange={handleHexChange}
        className="py-2 px-4 bg-accent rounded-md"
      />

      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-red-400 w-3">R</span>
          <input
            type="range"
            min="0"
            max="255"
            value={rgbValues.r}
            onChange={(e) => handleRgbChange("r", parseInt(e.target.value))}
            className="flex-1 min-w-0 accent-red-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-green-400 w-3">G</span>
          <input
            type="range"
            min="0"
            max="255"
            value={rgbValues.g}
            onChange={(e) => handleRgbChange("g", parseInt(e.target.value))}
            className="flex-1 min-w-0 accent-green-700"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-blue-400 w-3">B</span>
          <input
            type="range"
            min="0"
            max="255"
            value={rgbValues.b}
            onChange={(e) => handleRgbChange("b", parseInt(e.target.value))}
            className="flex-1 min-w-0 accent-blue-500"
          />
        </div>
        <input
          value={`RGB (${rgbValues.r}, ${rgbValues.g}, ${rgbValues.b})`}
          readOnly // TODO:fix this
          className="py-2 px-4 bg-accent rounded-md w-full mt-2"
        />
      </div>
    </div>
  );
}
