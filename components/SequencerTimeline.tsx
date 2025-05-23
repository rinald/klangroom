import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SequencerTimeline() {
  return (
    <Card className="col-span-8 row-span-3 bg-gray-800 border-gray-700 flex flex-col">
      <CardHeader>
        <CardTitle className="text-white">Sequencer / Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Placeholder for sequencer grid */}
        <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-md flex items-center justify-center">
          <p className="text-gray-500">Sequencer/Timeline Area</p>
        </div>
      </CardContent>
    </Card>
  );
} 