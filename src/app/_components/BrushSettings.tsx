import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Separator,
} from "@/components/ui";
import { usePage } from "@/hooks/usePage";
import { PRESET_COLORS } from "@/lib/constants";
import { handleCopy } from "@/lib/utils";
import { CopyIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

type ColorCode = "HEX" | "RGB";

export function BrushSettings() {
  const { brushColor, setBrushColor, rgbValues, setRgbValues, brushSize } =
    usePage();

  const [brushColors, setBrushColors] = useState<string[]>([]);
  const [colorCode, setColorCode] = useState<ColorCode>("HEX");

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
    localStorage.setItem("brush-color", hex);

    // convert hex to rgb
    convertHexToRgb(hex);
  }

  function handleSelectColorCode(code: ColorCode) {
    setColorCode(code);
    localStorage.setItem("color-code", code);
  }

  function handleAddBrushColor(color: string) {
    if (brushColors.length === 0) {
      localStorage.setItem("brush-colors", `["${color}"]`);
      brushColors.push(color);
      setBrushColors([...brushColors]);
    } else {
      brushColors.push(color);
      const uniqueBrushes = new Set(brushColors);

      const formatted = JSON.stringify([...uniqueBrushes]);
      localStorage.setItem("brush-colors", formatted);

      const formattedArray = JSON.parse(formatted);
      setBrushColors(formattedArray);
    }

    localStorage.setItem("brush-color", color);
    setBrushColor(color);
  }

  function handleRemoveBrushColor(color: string) {
    brushColors.push(color);

    const uniqueBrushes = new Set(brushColors);
    uniqueBrushes.delete(brushColor);

    const formatted = JSON.stringify([...uniqueBrushes]);
    localStorage.setItem("brush-colors", formatted);

    const formattedArray = JSON.parse(formatted);
    setBrushColors(formattedArray);

    const newBrushColor = formattedArray[formattedArray.length - 1];
    setBrushColor(newBrushColor);
    localStorage.setItem("brush-color", newBrushColor);
  }

  useEffect(() => {
    const initialColorCode = (localStorage.getItem("color-code") ??
      "HEX") as ColorCode;
    setColorCode(initialColorCode);

    const colors = localStorage.getItem("brush-colors");
    if (!colors) {
      setBrushColors([]);
    } else {
      setBrushColors(JSON.parse(colors));
    }
  }, []);

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

      <div className="bg-accent items-center justify-center p-3 space-y-3 rounded-md">
        <HexColorPicker
          color={brushColor}
          onChange={handleHexChange}
          style={{ width: "100%", height: "280px" }}
        />
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((presetColor) => {
            return (
              <Button
                data-selected={presetColor === brushColor}
                variant="ghost"
                key={presetColor}
                className="rounded border border-foreground/15 w-6 h-6 p-0 hover:scale-125 transition-all data-[selected=true]:border-foreground/50 data-[selected=true]:mx-1 data-[selected=true]:scale-125"
                style={{ backgroundColor: presetColor }}
                onClick={() => handleHexChange(presetColor)}
              />
            );
          })}
        </div>

        <Separator />

        <div className="flex flex-wrap gap-1 justify-between">
          {brushColors.length !== 0 && (
            <div className="flex gap-1">
              {brushColors.map((presetColor) => {
                return (
                  <Button
                    key={presetColor}
                    variant="ghost"
                    data-selected={presetColor === brushColor}
                    className="rounded border border-foreground/25 w-6 h-6 p-0 hover:scale-125 transition-all data-[selected=true]:border-foreground/50 data-[selected=true]:mx-1 data-[selected=true]:scale-125"
                    style={{ backgroundColor: presetColor }}
                    onClick={() => handleHexChange(presetColor)}
                  />
                );
              })}
            </div>
          )}
          <div className="flex">
            <Button
              disabled={brushColors.length >= 10}
              variant="secondary"
              className="rounded-r w-6 h-6 p-0"
              onClick={() => handleAddBrushColor(brushColor)}
            >
              <PlusIcon />
            </Button>
            {brushColors.length !== 0 && (
              <>
                <Separator orientation="vertical" />
                <Button
                  variant="secondary"
                  className="rounded-l w-6 h-6 p-0"
                  onClick={() => handleRemoveBrushColor(brushColor)}
                >
                  <MinusIcon />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="min-w-16 rounded-l-sm">
            <Button className="rounded-r-none rounded-l-sm">{colorCode}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              active={colorCode === "HEX"}
              onClick={() => handleSelectColorCode("HEX")}
            >
              Hex
            </DropdownMenuItem>
            <DropdownMenuItem
              active={colorCode === "RGB"}
              onClick={() => handleSelectColorCode("RGB")}
            >
              RGB
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {colorCode === "HEX" ? (
          <HexColorInput
            prefixed
            color={brushColor}
            onChange={handleHexChange}
            className="py-1 px-4 bg-accent rounded-none min-w-0 flex-1"
          />
        ) : (
          <div className="flex flex-1">
            <Input
              min={0}
              type="number"
              value={rgbValues.r}
              placeholder="R"
              className="rounded-none border-none bg-accent text-red-400 text-center no-spinner"
              onChange={(e) => handleRgbChange("r", parseInt(e.target.value))}
            />
            <Separator orientation="vertical" />
            <Input
              min={0}
              type="number"
              value={rgbValues.g}
              placeholder="G"
              className="rounded-none border-none bg-accent text-green-400 text-center no-spinner"
              onChange={(e) => handleRgbChange("g", parseInt(e.target.value))}
            />
            <Separator orientation="vertical" />
            <Input
              min={0}
              type="number"
              value={rgbValues.b}
              placeholder="B"
              className="rounded-none border-none bg-accent text-blue-400 text-center no-spinner"
              onChange={(e) => handleRgbChange("b", parseInt(e.target.value))}
            />
          </div>
        )}
        <Button
          className="rounded-l-none"
          onClick={() => {
            const value =
              colorCode === "HEX"
                ? brushColor
                : `rgb(${rgbValues.r},${rgbValues.g},${rgbValues.b})`;
            handleCopy(value);
          }}
        >
          <CopyIcon color="white" />
        </Button>
      </div>

      <Separator />
    </div>
  );
}
