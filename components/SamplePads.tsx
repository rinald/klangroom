import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const padCount = 16; // 4x4 grid

export default function SamplePads() {
  return (
    <Card className="col-span-4 row-span-3 bg-gray-800 border-gray-700 flex flex-col">
      <CardHeader>
        <CardTitle className="text-white">Sample Pads</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow grid grid-cols-4 gap-2">
        {Array.from({ length: padCount }).map((_, index) => (
          <Button
            key={index}
            variant="outline"
            className="aspect-square w-full h-full bg-gray-700 hover:bg-gray-600 border-gray-500 text-white text-xs p-1"
          >
            Pad {index + 1}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
} 