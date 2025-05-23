import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SampleEditorBrowser() {
  return (
    <Card className="col-span-6 row-span-2 bg-gray-800 border-gray-700 flex flex-col">
      <CardHeader>
        <CardTitle className="text-white">Sample Editor / Browser</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-md flex items-center justify-center">
          <p className="text-gray-500">Sample Editor & Browser Area</p>
        </div>
      </CardContent>
    </Card>
  );
} 