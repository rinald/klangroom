import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TransportControls from "./TransportControls";
import SamplePads from "./SamplePads";
import SequencerTimeline from "./SequencerTimeline";
import MixerVisualizer from "./MixerVisualizer";
import SampleEditorBrowser from "./SampleEditorBrowser";

export default function KlangroomLayout() {
  return (
    <div className="container mx-auto p-4 grid grid-cols-12 grid-rows-6 gap-4 h-screen">
      {/* Transport Controls - Use the new component */}
      <TransportControls />

      {/* Sample Grid/Pads - Use the new component */}
      <SamplePads />

      {/* Sequencer/Timeline - Use the new component */}
      <SequencerTimeline />

      {/* Mixer & Sound Visualizer - Bottom Left & Middle */}
      <Card className="col-span-6 row-span-2 bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Mixer / Visualizer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Faders, meters, visuals...</p>
        </CardContent>
      </Card>

      {/* Sample Editor / Browser - Bottom Right */}
      <Card className="col-span-6 row-span-2 bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Sample Editor / Browser</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Waveform, file list...</p>
        </CardContent>
      </Card>

      {/* Mixer & Sound Visualizer - Use the new component */}
      <MixerVisualizer />

      {/* Sample Editor / Browser - Use the new component */}
      <SampleEditorBrowser />
    </div>
  );
} 