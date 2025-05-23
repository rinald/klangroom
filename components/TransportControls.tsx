import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TransportControls() {
  return (
    <Card className="bg-neutral-700 border-neutral-600 rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-neutral-200 text-sm font-medium">TRANSPORT</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center space-x-2">
        <Button variant="outline" className="bg-orange-500 hover:bg-orange-600 text-white border-orange-700 h-10 w-16 text-xs">
          ▶
        </Button>
        <Button variant="outline" className="bg-neutral-600 hover:bg-neutral-500 text-neutral-200 border-neutral-500 h-10 w-16 text-xs">
          ❚❚
        </Button>
        <Button variant="outline" className="bg-neutral-600 hover:bg-neutral-500 text-neutral-200 border-neutral-500 h-10 w-16 text-xs">
          ■
        </Button>
        <Button variant="outline" className="bg-red-600 hover:bg-red-700 text-white border-red-800 h-10 w-16 text-xs">
          ●
        </Button>
        <div className="flex items-center space-x-2 ml-auto">
          <span className="text-neutral-400 text-xs">BPM</span>
          <input type="number" defaultValue={120} className="w-16 bg-neutral-800 border-neutral-600 text-neutral-200 p-1 rounded h-10 text-sm text-center" />
          <Button variant="outline" className="bg-neutral-600 hover:bg-neutral-500 text-neutral-200 border-neutral-500 h-10 text-xs px-3">
            METRO
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 