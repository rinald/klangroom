import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TransportControls() {
  return (
    <Card className="col-span-12 row-span-1 bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Transport</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center space-x-2">
        <Button variant="outline" className="bg-green-500 hover:bg-green-600 text-white border-green-700">
          ▶ Play
        </Button>
        <Button variant="outline" className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-700">
          ❚❚ Pause
        </Button>
        <Button variant="outline" className="bg-red-500 hover:bg-red-600 text-white border-red-700">
          ■ Stop
        </Button>
        <Button variant="outline" className="bg-red-700 hover:bg-red-800 text-white border-red-900">
          ● Record
        </Button>
        <div className="flex items-center space-x-2 ml-auto">
          <span className="text-gray-400">Tempo:</span>
          <input type="number" defaultValue={120} className="w-20 bg-gray-700 border-gray-600 text-white p-1 rounded" />
          <Button variant="outline" className="bg-gray-600 hover:bg-gray-700 text-white border-gray-500">
            Metronome
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 