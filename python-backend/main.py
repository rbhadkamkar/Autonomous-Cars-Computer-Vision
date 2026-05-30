import os
import sys
import json
import tempfile
import traceback
from pathlib import Path
from collections import defaultdict

import numpy as np
import cv2
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

sys.path.insert(0, str(Path(__file__).parent))
import model_setup

app = FastAPI(title="Autonomous Car Object Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_labels = None
_anchors = None

def get_model():
    global _model, _labels, _anchors
    if _model is None:
        import tensorflow as tf
        from helpers import detect_image
        _model = tf.keras.models.load_model(model_setup.paths["yolo_model.keras"])
        with open(model_setup.paths["labels.json"]) as f:
            _labels = json.load(f)
        with open(model_setup.paths["anchors.json"]) as f:
            _anchors = json.load(f)
    return _model, _labels, _anchors

OBJECT_EMOJIS = {
    "person": "🚶", "bicycle": "🚲", "car": "🚗", "motorbike": "🏍️",
    "aeroplane": "✈️", "bus": "🚌", "train": "🚂", "truck": "🚚",
    "boat": "⛵", "traffic light": "🚦", "fire hydrant": "🚒",
    "stop sign": "🛑", "parking meter": "🅿️", "bench": "🪑",
    "bird": "🐦", "cat": "🐱", "dog": "🐕", "horse": "🐴",
    "sheep": "🐑", "cow": "🐄", "elephant": "🐘", "bear": "🐻",
    "zebra": "🦓", "giraffe": "🦒", "backpack": "🎒",
    "umbrella": "☂️", "handbag": "👜", "suitcase": "🧳",
    "bottle": "🍾", "cup": "☕", "laptop": "💻", "mouse": "🖱️",
    "keyboard": "⌨️", "cell phone": "📱", "clock": "🕐",
    "book": "📚", "vase": "🏺", "scissors": "✂️",
}

OBJECT_DESCRIPTIONS = {
    "person": "Pedestrian detected — keeping humans safe on the road",
    "bicycle": "Cyclist in the vicinity — extra caution advised",
    "car": "Vehicle identified — monitoring traffic flow",
    "motorbike": "Motorcycle spotted — adjusting blind-spot coverage",
    "bus": "Public transit vehicle — large obstacle ahead",
    "truck": "Heavy freight vehicle — maintaining safe following distance",
    "traffic light": "Traffic signal detected — parsing signal state",
    "stop sign": "Stop sign recognised — preparing to halt",
    "fire hydrant": "Emergency infrastructure marked — route clearance",
    "aeroplane": "Aircraft in view — overhead monitoring active",
    "train": "Rail vehicle detected — crossing caution engaged",
}

LABEL_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#82E0AA", "#F0B27A", "#AED6F1", "#A9DFBF", "#F9E79F",
]

@app.get("/inference/health")
def health():
    return {"status": "ok"}

@app.post("/inference/detect")
async def detect_video(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Only video files are accepted")

    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        content = await file.read()
        tmp_in.write(content)
        input_path = tmp_in.name

    output_path = tempfile.mktemp(suffix=".mp4")

    try:
        model, labels, anchors = get_model()
        from helpers import detect_image, draw_boxes, preprocess_input, decode_netout, do_nms

        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        detection_stats = defaultdict(lambda: {"count": 0, "total_conf": 0.0, "frames": set()})
        frame_idx = 0
        SAMPLE_EVERY = max(1, int(fps / 5))

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % SAMPLE_EVERY == 0:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image_pil = Image.fromarray(frame_rgb)
                image_w, image_h = image_pil.size

                new_image = preprocess_input(image_pil, 416, 416)
                yolo_outputs = model.predict(new_image, verbose=0)
                boxes = decode_netout(yolo_outputs, 0.4, anchors, image_h, image_w, 416, 416)
                boxes = do_nms(boxes, 0.45, 0.4)

                for box in boxes:
                    label = labels[box.get_label()]
                    detection_stats[label]["count"] += 1
                    detection_stats[label]["total_conf"] += float(box.get_score())
                    detection_stats[label]["frames"].add(frame_idx)

                annotated_pil = draw_boxes(image_pil, boxes, labels)
                annotated_arr = np.array(annotated_pil)
                annotated_bgr = cv2.cvtColor(annotated_arr, cv2.COLOR_RGB2BGR)
            else:
                annotated_bgr = frame

            out.write(annotated_bgr)
            frame_idx += 1

        cap.release()
        out.release()

        formatted_stats = []
        for i, (label, stats) in enumerate(sorted(
            detection_stats.items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )):
            count = stats["count"]
            avg_conf = stats["total_conf"] / count if count > 0 else 0
            formatted_stats.append({
                "label": label,
                "count": count,
                "avg_confidence": round(avg_conf, 3),
                "color": LABEL_COLORS[i % len(LABEL_COLORS)],
                "emoji": OBJECT_EMOJIS.get(label, "🔍"),
                "description": OBJECT_DESCRIPTIONS.get(
                    label,
                    f"{label.capitalize()} object detected in scene"
                ),
                "frame_appearances": len(stats["frames"]),
            })

        result_id = Path(output_path).stem
        _output_registry[result_id] = output_path

        return JSONResponse({
            "result_id": result_id,
            "total_frames": frame_idx,
            "fps": fps,
            "resolution": {"width": width, "height": height},
            "detections": formatted_stats,
            "unique_classes": len(formatted_stats),
            "total_detections": sum(s["count"] for s in formatted_stats),
        })

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
    finally:
        try:
            os.unlink(input_path)
        except Exception:
            pass

_output_registry: dict[str, str] = {}

@app.get("/inference/video/{result_id}")
def get_video(result_id: str):
    if result_id not in _output_registry:
        raise HTTPException(status_code=404, detail="Video not found")
    path = _output_registry[result_id]
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Video file expired or missing")
    return FileResponse(path, media_type="video/mp4", filename="detected.mp4")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PYTHON_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
