import { Camera, Layers, PlaySquare, Radar, ScanSearch, ShieldCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FACTS = [
  {
    title: "Single-Pass Architecture",
    icon: <PlaySquare className="w-4 h-4 text-primary" />,
    content: "Unlike older models that scan an image multiple times, YOLO (You Only Look Once) analyzes the entire image in a single forward pass through the neural network. This is what enables its extreme real-time speed."
  },
  {
    title: "Grid Cells & Anchor Boxes",
    icon: <Layers className="w-4 h-4 text-primary" />,
    content: "The image is divided into an S×S grid. Each grid cell predicts bounding boxes and confidence scores for those boxes. Anchor boxes of predefined shapes help the model quickly identify common object proportions like a tall pedestrian or a wide car."
  },
  {
    title: "Confidence Scores",
    icon: <Radar className="w-4 h-4 text-primary" />,
    content: "A confidence score reflects two things: how certain the model is that an object exists in that box, and how accurate it thinks the box coordinates are. A score of 0.85 means 85% certainty that the prediction matches ground truth."
  },
  {
    title: "Non-Maximum Suppression",
    icon: <ScanSearch className="w-4 h-4 text-primary" />,
    content: "Often, the network predicts multiple overlapping boxes for the same object. Non-Maximum Suppression (NMS) is a filtering algorithm that keeps only the highest-confidence box and discards the redundant ones."
  },
  {
    title: "Sensor Fusion in AVs",
    icon: <Camera className="w-4 h-4 text-primary" />,
    content: "While camera-based YOLO detection is powerful, real autonomous vehicles fuse these 2D vision outputs with 3D LiDAR point clouds and radar data to create a robust, fault-tolerant perception system."
  },
  {
    title: "Latency Means Life",
    icon: <ShieldCheck className="w-4 h-4 text-primary" />,
    content: "At highway speeds (65 mph), a car travels about 95 feet per second. Processing a frame in 30ms vs 100ms gives the vehicle an extra 6.5 feet of reaction distance—often the difference between a close call and a collision."
  }
];

export function FunFacts() {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold uppercase tracking-widest text-foreground mb-8 flex items-center gap-3">
        <span className="text-2xl">🛸</span> Did You Know?
      </h2>
      <div className="bg-card/30 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
        <Accordion type="single" collapsible className="w-full">
          {FACTS.map((fact, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/50">
              <AccordionTrigger className="text-left font-medium hover:text-primary transition-colors data-[state=open]:text-primary">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-secondary/50 border border-border/50">
                    {fact.icon}
                  </div>
                  {fact.title}
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pl-12 pt-2">
                {fact.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
