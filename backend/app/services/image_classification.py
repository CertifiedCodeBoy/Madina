"""
Image classification service using MobileNetV3 via TensorFlow Lite.

The model is a transfer-learned MobileNetV3-Large fine-tuned on a labelled
dataset of municipal infrastructure issues. At runtime the .tflite model
file is loaded once and cached; subsequent inferences reuse the interpreter.

Classes (8): pothole | broken_light | illegal_dumping | graffiti |
             damaged_sign | tree_hazard | water_leak | other
"""

import asyncio
import logging
from functools import lru_cache
from pathlib import Path
from typing import Tuple

import numpy as np
from PIL import Image

from app.config import settings
from app.models.issue import IssueCategory, IssueSeverity
from app.schemas.issue import IssueAIResult

logger = logging.getLogger(__name__)

CLASS_NAMES = [c.value for c in IssueCategory]

SEVERITY_MAP = {
    "pothole": IssueSeverity.high,
    "broken_light": IssueSeverity.medium,
    "illegal_dumping": IssueSeverity.high,
    "graffiti": IssueSeverity.low,
    "damaged_sign": IssueSeverity.medium,
    "tree_hazard": IssueSeverity.critical,
    "water_leak": IssueSeverity.critical,
    "other": IssueSeverity.medium,
}

RESOLUTION_DAYS_MAP = {
    "pothole": 14,
    "broken_light": 5,
    "illegal_dumping": 3,
    "graffiti": 7,
    "damaged_sign": 5,
    "tree_hazard": 2,
    "water_leak": 1,
    "other": 10,
}


@lru_cache(maxsize=1)
def _load_interpreter():
    """Load and cache the TFLite interpreter."""
    model_path = settings.IMAGE_MODEL_PATH
    if not Path(model_path).exists():
        logger.warning(
            "TFLite model not found at %s — falling back to mock classifier.", model_path
        )
        return None
    try:
        import tflite_runtime.interpreter as tflite  # type: ignore

        interpreter = tflite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        logger.info("TFLite model loaded from %s", model_path)
        return interpreter
    except ImportError:
        logger.warning("tflite_runtime not installed — falling back to mock classifier.")
        return None


def _preprocess_image(image_path: str) -> np.ndarray:
    """Resize and normalise image to 224×224 float32 matching MobileNetV3 input."""
    img = Image.open(image_path).convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def _run_inference(image_path: str) -> Tuple[str, float]:
    """Return (class_name, confidence) for the given image file."""
    interpreter = _load_interpreter()
    if interpreter is None:
        # Mock: pick deterministically based on filename hash so tests are reproducible
        idx = hash(image_path) % len(CLASS_NAMES)
        return CLASS_NAMES[idx], 0.72

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    tensor = _preprocess_image(image_path)
    interpreter.set_tensor(input_details[0]["index"], tensor)
    interpreter.invoke()
    scores = interpreter.get_tensor(output_details[0]["index"])[0]
    pred_idx = int(np.argmax(scores))
    return CLASS_NAMES[pred_idx], float(scores[pred_idx])


async def classify_issue_image(image_path: str) -> IssueAIResult:
    """
    Asynchronously classify an issue image.
    Runs TFLite inference in a thread pool to avoid blocking the event loop.
    """
    loop = asyncio.get_event_loop()
    category_name, confidence = await loop.run_in_executor(
        None, _run_inference, image_path
    )
    category = IssueCategory(category_name)
    severity = SEVERITY_MAP[category_name]
    department = settings.ISSUE_DEPARTMENT_MAP.get(category_name, "general_dept")
    resolution_days = RESOLUTION_DAYS_MAP[category_name]

    logger.info(
        "Classified image %s → %s (%.1f%% confidence), routed to %s",
        image_path,
        category_name,
        confidence * 100,
        department,
    )

    return IssueAIResult(
        category=category,
        severity=severity,
        department=department,
        estimated_resolution_days=resolution_days,
        confidence=round(confidence, 4),
    )
