import { motion } from "framer-motion";
import { Activity, Clock, Layers, Monitor, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type DetectionResult = {
  result_id: string;
  total_frames: number;
  fps: number;
  resolution: { width: number; height: number };
  detections: Array<{
    label: string;
    count: number;
    avg_confidence: number;
    color: string;
    emoji: string;
    description: string;
    frame_appearances: number;
  }>;
  unique_classes: number;
  total_detections: number;
};

export function ResultsView({ data }: { data: DetectionResult }) {
  const videoUrl = `/inference/video/${data.result_id}`;
  const sortedDetections = [...data.detections].sort((a, b) => b.count - a.count);

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-700 slide-in-from-bottom-8">
      {/* Video Player */}
      <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/5 bg-black mb-8 aspect-video flex items-center justify-center">
        <video 
          src={videoUrl} 
          controls 
          autoPlay 
          muted 
          loop 
          className="w-full h-full object-contain"
        />
        <div className="absolute top-4 right-4 flex gap-2 pointer-events-none">
          <div className="px-3 py-1 rounded bg-black/60 backdrop-blur text-xs font-mono border border-white/10 flex items-center gap-2 text-primary">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            LIVE
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-md bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Detections</p>
              <p className="text-2xl font-bold font-mono">{data.total_detections}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-md bg-secondary text-muted-foreground">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Unique Classes</p>
              <p className="text-2xl font-bold font-mono">{data.unique_classes}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-md bg-secondary text-muted-foreground">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Processing FPS</p>
              <p className="text-2xl font-bold font-mono">{data.fps.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-md bg-secondary text-muted-foreground">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Resolution</p>
              <p className="text-xl font-bold font-mono tracking-tighter">{data.resolution.width}x{data.resolution.height}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detections List */}
      <h3 className="text-xl font-semibold mb-4 uppercase tracking-wider text-foreground">Class Detections</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedDetections.map((det, i) => (
          <motion.div
            key={det.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-card/50 border-border/50 overflow-hidden relative">
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 opacity-80" 
                style={{ backgroundColor: det.color }}
              />
              <CardContent className="p-5 pl-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{det.emoji}</span>
                    <div>
                      <h4 className="font-bold text-lg leading-none capitalize">{det.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{det.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Count</span>
                    <p className="font-mono text-xl font-bold leading-none">{det.count}</p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Avg Confidence</span>
                    <span className="font-mono">{(det.avg_confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor]" 
                      style={{ 
                        width: `${det.avg_confidence * 100}%`,
                        backgroundColor: det.color,
                        color: det.color
                      }} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
