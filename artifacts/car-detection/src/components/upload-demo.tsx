import { useState } from "react";
import { UploadCloud, Video, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const SCENARIOS = [
  { id: "highway", title: "Highway Merge", description: "High-speed multi-lane detection" },
  { id: "urban", title: "Urban Intersection", description: "Complex pedestrian & vehicle tracking" },
  { id: "night", title: "Rainy Night", description: "Low-visibility condition processing" },
  { id: "school", title: "School Zone", description: "High-density pedestrian detection" },
];

export function UploadDemo({ onDetect }: { onDetect: (file: File) => void }) {
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        onDetect(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a video file (.mp4, .mov, etc.)",
          variant: "destructive",
        });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onDetect(e.target.files[0]);
    }
  };

  const triggerSample = (scenario: typeof SCENARIOS[0]) => {
    toast({
      title: "Sample Scenario: " + scenario.title,
      description: "Upload your own video to try this scenario.",
    });
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-12">
      <div 
        className={`relative w-full rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-primary/50 bg-card/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        data-testid="upload-zone"
      >
        <input 
          type="file" 
          accept="video/*" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          onChange={handleChange}
          data-testid="input-video-upload"
        />
        <div className="pointer-events-none flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Drag & Drop Dashcam Footage</h3>
          <p className="text-muted-foreground">MP4, MOV, or WebM • Max 100MB</p>
          <Button variant="outline" className="pointer-events-auto z-10 border-primary/50 text-primary hover:bg-primary/20">
            Select Video File
          </Button>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-lg font-medium text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
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
                <h4 className="font-semibold text-foreground">{s.title}</h4>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
