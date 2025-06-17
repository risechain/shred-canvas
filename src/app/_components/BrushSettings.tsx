import { Card } from "@/components/ui";
import { usePage } from "@/hooks/usePage";

export function BrushSettings() {
  const { brushColor, setBrushColor, rgbValues, setRgbValues } = usePage();

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

  return (
    <div>
      <p className="text-md md:text-lg text-text-accent">Brush Settings</p>
      <Card variant="secondary" className="gap-5 md:p-4 rounded mt-5">
        {/* Color picker */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2 text-center">
            Color{" "}
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="block w-full h-12 mt-2 rounded cursor-pointer"
            />
          </label>
        </div>
        {/* RGB sliders */}
        <div className="mb-8 space-y-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            RGB Values:
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-400 w-6">R</span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgbValues.r}
                onChange={(e) => handleRgbChange("r", parseInt(e.target.value))}
                className="flex-1 accent-red-500"
              />
              <span className="text-sm text-gray-300 w-8 text-right">
                {rgbValues.r}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-green-400 w-6">G</span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgbValues.g}
                onChange={(e) => handleRgbChange("g", parseInt(e.target.value))}
                className="flex-1 accent-green-500"
              />
              <span className="text-sm text-gray-300 w-8 text-right">
                {rgbValues.g}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-400 w-6">B</span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgbValues.b}
                onChange={(e) => handleRgbChange("b", parseInt(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-sm text-gray-300 w-8 text-right">
                {rgbValues.b}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
