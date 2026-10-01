import { useRef, useState } from "react";
import { UploadCloud, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

const SCENARIOS = [
  { id: "highway",  title: "Highway Merge",      description: "High-speed multi-lane detection" },
  { id: "urban",    title: "Urban Intersection",  description: "Complex pedestrian & vehicle tracking" },
  { id: "night",    title: "Rainy Night",         description: "Low-visibility condition processing" },
  { id: "school",   title: "School Zone",         description: "High-density pedestrian detection" },
];

interface Props {
  onDetect: (file: File, threshold: number) => void;
}

export function UploadDemo({ onDetect }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive]   = useState(false);
  const [threshold, setThreshold]     = useState(40); // stored as 0–100
  const { toast } = useToast();

  const submit = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid file type", description: "Please upload a video file (.mp4, .mov, etc.)", variant: "destructive" });
      return;
    }
    onDetect(file, threshold / 100);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) submit(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) submit(file);
  };

  const triggerSample = (s: typeof SCENARIOS[0]) => {
    toast({ title: "Sample Scenario: " + s.title, description: "Upload your own dashcam video to try this scenario." });
  };

  const thresholdLabel =
    threshold < 30 ? "Very Sensitive" :
    threshold < 50 ? "Sensitive" :
    threshold < 70 ? "Balanced" :
    threshold < 85 ? "Strict" : "Very Strict";

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-12">
      {/* Upload zone */}
      <div
        className={`relative w-full rounded-xl border-2 border-dashed p-12 text-center transition-all ${
          dragActive
            ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(0,200,255,0.2)]"
            : "border-muted-foreground/30 hover:border-primary/50 bg-card/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        data-testid="upload-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.avi,.mkv"
          className="sr-only"
          onChange={handleChange}
          data-testid="input-video-upload"
        />
        <div className="pointer-events-none flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Drag & Drop Dashcam Footage</h3>
          <p className="text-muted-foreground">MP4, MOV, or WebM • Max 100MB</p>
          <Button
            type="button"
            variant="outline"
            className="pointer-events-auto z-10 border-primary/50 text-primary hover:bg-primary/20"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Video File
          </Button>
        </div>
      </div>

      {/* Confidence threshold slider */}
      <div className="mt-8 p-5 rounded-xl border border-border/50 bg-card/40 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Detection Threshold</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Minimum confidence required before an object is marked
            </p>
          </div>
          <div className="text-right">
            <span
              className="text-2xl font-mono font-bold text-primary tabular-nums"
              data-testid="text-threshold-value"
            >
              {threshold}%
            </span>
            <p className="text-xs text-muted-foreground">{thresholdLabel}</p>
          </div>
        </div>

        <Slider
          min={10}
          max={90}
          step={5}
          value={[threshold]}
          onValueChange={([v]) => setThreshold(v)}
          className="w-full"
          data-testid="slider-threshold"
        />

        <div className="flex justify-between text-xs text-muted-foreground font-mono">
          <span>10% — catches everything</span>
          <span>90% — only high-confidence hits</span>
        </div>
      </div>

      {/* Demo scenarios */}
      <div className="mt-10">
        <h3 className="text-lg font-medium mb-4 uppercase tracking-wider flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" /> Demo Scenarios
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SCENARIOS.map((s) => (
            <Card
              key={s.id}
              className="bg-card/50 border-border/50 hover:border-primary/50 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,255,255,0.1)] group"
              onClick={() => triggerSample(s)}
              data-testid={`card-scenario-${s.id}`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold">{s.title}</h4>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
