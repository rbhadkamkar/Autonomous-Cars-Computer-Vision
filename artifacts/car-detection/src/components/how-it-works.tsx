import { ArrowRight, Cpu, Eye, Filter, Network, Maximize } from "lucide-react";
import { Card } from "@/components/ui/card";

const PIPELINE = [
  {
    id: "input",
    title: "Video Frame",
    icon: <Eye className="w-5 h-5" />,
    desc: "Raw camera feed"
  },
  {
    id: "preprocess",
    title: "Preprocessing",
    icon: <Maximize className="w-5 h-5" />,
    desc: "Resize & normalize"
  },
  {
    id: "network",
    title: "YOLO Network",
    icon: <Network className="w-5 h-5" />,
    desc: "Feature extraction"
  },
  {
    id: "decode",
    title: "Decode Outputs",
    icon: <Cpu className="w-5 h-5" />,
    desc: "Grid predictions"
  },
  {
    id: "nms",
    title: "NMS Filter",
    icon: <Filter className="w-5 h-5" />,
    desc: "Remove overlaps"
  },
  {
    id: "output",
    title: "Annotated Frame",
    icon: <Eye className="w-5 h-5 text-primary" />,
    desc: "Rendered overlay"
  }
];

export function HowItWorks() {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold uppercase tracking-widest text-foreground mb-12 text-center">
        Perception Pipeline
      </h2>
      
      <div className="relative">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border/50 -translate-y-1/2 hidden lg:block" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 relative z-10">
          {PIPELINE.map((step, i) => (
            <div key={step.id} className="relative group">
              {i !== PIPELINE.length - 1 && (
                <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              
              <Card className="bg-card/80 border-border/50 backdrop-blur flex flex-col items-center text-center p-6 h-full transition-colors hover:border-primary/50 hover:bg-card">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${i === PIPELINE.length - 1 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border/50 text-muted-foreground group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/10'} transition-colors`}>
                  {step.icon}
                </div>
                <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
