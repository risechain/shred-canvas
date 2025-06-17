import { Card } from "@/components/ui";
import { usePage } from "@/hooks/usePage";

export function BrushPreview() {
  const { brushColor, brushSize, rgbValues } = usePage();

  return (
    <div>
      <p className="text-md md:text-lg text-text-accent">Brush Preview</p>
      <Card variant="secondary" className="gap-5 md:p-4 rounded mt-5">
        <div
          className="rounded-full shadow-lg w-10 h-10"
          style={{
            backgroundColor: brushColor,
          }}
        />
        <div className="text-sm text-white space-y-1">
          <p>Size: {brushSize}px</p>
          <p>Color: {brushColor}</p>
          <p>
            RGB: ({rgbValues.r}, {rgbValues.g}, {rgbValues.b})
          </p>
        </div>
      </Card>
    </div>
  );
}
