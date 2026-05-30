import os
import sys
import json
import tempfile
import traceback
import subprocess
from pathlib import Path
from collections import defaultdict

import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
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
        _model = tf.keras.models.load_model(model_setup.paths["yolo_model.keras"])
        with open(model_setup.paths["labels.json"]) as f:
            _labels = json.load(f)
        with open(model_setup.paths["anchors.json"]) as f:
            _anchors = json.load(f)
    return _model, _labels, _anchors

# Fixed color palette — one stable color per class index (mod 30).
# Class index is permanent (from labels.json), so colors never change between frames.
CLASS_COLORS = [
    (0,   200, 255),   # 0  cyan-blue
    (255,  80,  80),   # 1  red
    (80,  255, 120),   # 2  green
    (255, 200,   0),   # 3  amber
    (180,  80, 255),   # 4  purple
    (255, 140,   0),   # 5  orange
    (0,   255, 200),   # 6  teal
    (255,  80, 200),   # 7  pink
    (120, 200, 255),   # 8  sky
    (255, 255,  80),   # 9  yellow
    (80,  180, 255),   # 10 light-blue
    (200, 255,  80),   # 11 lime
    (255, 120, 120),   # 12 salmon
    (80,  255, 255),   # 13 aqua
    (220, 160, 255),   # 14 lavender
    (255, 180,  80),   # 15 gold
    (80,  255, 160),   # 16 mint
    (255,  80, 140),   # 17 rose
    (160, 255,  80),   # 18 chartreuse
    (80,  120, 255),   # 19 indigo
    (255, 220, 120),   # 20 peach
    (120, 255, 200),   # 21 seafoam
    (200,  80, 255),   # 22 violet
    (255, 160,  80),   # 23 tangerine
    (80,  200, 200),   # 24 steel-teal
    (255, 100, 160),   # 25 hot-pink
    (100, 255, 120),   # 26 spring
    (160, 200, 255),   # 27 periwinkle
    (255, 200, 160),   # 28 apricot
    (200, 255, 160),   # 29 pear
]

# Web hex versions of the same palette (for frontend cards)
CLASS_COLORS_HEX = [
    "#00C8FF", "#FF5050", "#50FF78", "#FFC800", "#B450FF",
    "#FF8C00", "#00FFC8", "#FF50C8", "#78C8FF", "#FFFF50",
    "#50B4FF", "#C8FF50", "#FF7878", "#50FFFF", "#DCA0FF",
    "#FFB450", "#50FFA0", "#FF508C", "#A0FF50", "#5078FF",
    "#FFDC78", "#78FFC8", "#C850FF", "#FFA050", "#50C8C8",
    "#FF64A0", "#64FF78", "#A0C8FF", "#FFC8A0", "#C8FFA0",
]

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


def is_ego_vehicle(box, image_w: int, image_h: int) -> bool:
    """
    Filter out the ego vehicle (car housing the dashcam).
    Its hood appears as a large box in the bottom-centre of the frame.
    Reject any box whose bottom edge is in the lowest 20% of the frame
    AND whose horizontal centre is within the middle 70% of the frame.
    """
    ymax_frac = box.ymax / image_h
    center_x_frac = (box.xmin + box.xmax) / 2 / image_w
    box_width_frac = (box.xmax - box.xmin) / image_w
    return (
        ymax_frac > 0.80
        and 0.15 < center_x_frac < 0.85
        and box_width_frac > 0.25   # must be wide to be the hood
    )


def draw_boxes_stable(image_pil: Image.Image, boxes, labels) -> Image.Image:
    """
    Draw bounding boxes with:
    - Stable colour per class (indexed into CLASS_COLORS, not random).
    - Coloured filled pill behind the label text for easy reading.
    - White label text with a dark stroke for maximum readability.
    """
    image = image_pil.copy()
    iw, ih = image.size
    thickness = max(3, (iw + ih) // 250)
    font_size = max(18, int(ih * 0.040))  # 4% of image height — very readable
    pad = 6
    stroke_w = 2

    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
            font_size,
        )
    except Exception:
        font = ImageFont.load_default()

    draw = ImageDraw.Draw(image)

    for box in boxes:
        c = box.get_label()
        color_rgb = CLASS_COLORS[c % len(CLASS_COLORS)]
        score = box.get_score()
        label_name = labels[c]
        label_text = f"{label_name}  {int(score * 100)}%"

        left   = max(0, int(box.xmin))
        top    = max(0, int(box.ymin))
        right  = min(iw, int(box.xmax))
        bottom = min(ih, int(box.ymax))

        if right <= left or bottom <= top:
            continue

        # Draw thick bounding box
        for t in range(thickness):
            draw.rectangle(
                [left - t, top - t, right + t, bottom + t],
                outline=color_rgb,
            )

        # Measure label pill size
        bbox = draw.textbbox((0, 0), label_text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

        pill_top = top - text_h - pad * 2 - thickness
        pill_bottom = top - thickness
        pill_left = left - thickness
        pill_right = left - thickness + text_w + pad * 2

        # Keep pill inside frame
        if pill_top < 0:
            pill_top = bottom + thickness
            pill_bottom = bottom + thickness + text_h + pad * 2

        # Filled pill background
        draw.rectangle([pill_left, pill_top, pill_right, pill_bottom], fill=color_rgb)

        # White label text with dark stroke for readability on any background
        draw.text(
            (pill_left + pad, pill_top + pad),
            label_text,
            fill=(255, 255, 255),
            font=font,
            stroke_width=stroke_w,
            stroke_fill=(0, 0, 0),
        )

    return image


@app.get("/inference/health")
def health():
    return {"status": "ok"}


@app.post("/inference/detect")
async def detect_video(
    file: UploadFile = File(...),
    threshold: float = Form(0.4),
):
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Only video files are accepted")

    threshold = max(0.1, min(0.95, threshold))

    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        content = await file.read()
        tmp_in.write(content)
        input_path = tmp_in.name

    raw_output_path = tempfile.mktemp(suffix=".avi")
    output_path = tempfile.mktemp(suffix=".mp4")

    try:
        model, labels, anchors = get_model()
        from helpers import preprocess_input, decode_netout, do_nms

        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        fourcc = cv2.VideoWriter_fourcc(*"MJPG")
        out = cv2.VideoWriter(raw_output_path, fourcc, fps, (width, height))

        detection_stats = defaultdict(lambda: {"count": 0, "total_conf": 0.0, "frames": set()})
        frame_idx = 0
        last_boxes: list = []
        SAMPLE_EVERY = max(1, int(fps / 5))

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % SAMPLE_EVERY == 0:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image_pil = Image.fromarray(frame_rgb)
                iw, ih = image_pil.size

                new_image = preprocess_input(image_pil, 416, 416)
                yolo_outputs = model.predict(new_image, verbose=0)
                boxes = decode_netout(yolo_outputs, threshold, anchors, ih, iw, 416, 416)
                boxes = do_nms(boxes, 0.45, threshold)

                # Filter out ego vehicle (car housing the camera)
                boxes = [b for b in boxes if not is_ego_vehicle(b, iw, ih)]
                last_boxes = boxes

                for box in boxes:
                    label = labels[box.get_label()]
                    detection_stats[label]["count"] += 1
                    detection_stats[label]["total_conf"] += float(box.get_score())
                    detection_stats[label]["frames"].add(frame_idx)

            # Always draw last known boxes on every frame
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image_pil = Image.fromarray(frame_rgb)
            if last_boxes:
                annotated_pil = draw_boxes_stable(image_pil, last_boxes, labels)
            else:
                annotated_pil = image_pil
            annotated_bgr = cv2.cvtColor(np.array(annotated_pil), cv2.COLOR_RGB2BGR)

            out.write(annotated_bgr)
            frame_idx += 1

        cap.release()
        out.release()

        # Re-encode to H.264 for browser playback
        ffmpeg_result = subprocess.run([
            "ffmpeg", "-y",
            "-i", raw_output_path,
            "-vcodec", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path,
        ], capture_output=True, text=True)
        if ffmpeg_result.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {ffmpeg_result.stderr}")
        try:
            os.unlink(raw_output_path)
        except Exception:
            pass

        # Build per-class stats, colour keyed by class index (stable)
        all_labels = labels  # full list from labels.json
        formatted_stats = []
        for label, stats in sorted(
            detection_stats.items(),
            key=lambda x: x[1]["count"],
            reverse=True,
        ):
            count = stats["count"]
            avg_conf = stats["total_conf"] / count if count > 0 else 0
            class_idx = all_labels.index(label) if label in all_labels else 0
            formatted_stats.append({
                "label": label,
                "count": count,
                "avg_confidence": round(avg_conf, 3),
                "color": CLASS_COLORS_HEX[class_idx % len(CLASS_COLORS_HEX)],
                "emoji": OBJECT_EMOJIS.get(label, "🔍"),
                "description": OBJECT_DESCRIPTIONS.get(
                    label,
                    f"{label.capitalize()} object detected in scene",
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
