"""
MobileNetV3-Large fine-tuning for municipal issue classification.

Usage:
    python train.py --data_dir /path/to/dataset --epochs 20 --batch_size 32

Dataset layout expected:
    data_dir/
        train/
            pothole/       (images)
            broken_light/
            illegal_dumping/
            graffiti/
            damaged_sign/
            tree_hazard/
            water_leak/
            other/
        val/
            <same structure>

Outputs:
    mobilenet_v3_issue.h5       (Keras SavedModel for further training)
    mobilenet_v3_issue.tflite   (quantised TFLite runtime for mobile inference)
"""

import argparse
import json
import os
from pathlib import Path

import numpy as np

CLASS_NAMES = [
    "pothole", "broken_light", "illegal_dumping", "graffiti",
    "damaged_sign", "tree_hazard", "water_leak", "other",
]


def parse_args():
    parser = argparse.ArgumentParser(description="Train MobileNetV3 issue classifier")
    parser.add_argument("--data_dir", type=str, default="data", help="Dataset root directory")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--img_size", type=int, default=224)
    parser.add_argument("--output_dir", type=str, default=".")
    parser.add_argument("--learning_rate", type=float, default=1e-4)
    return parser.parse_args()


def build_model(num_classes: int, img_size: int):
    """Build MobileNetV3-Large with transfer learning head."""
    import tensorflow as tf

    base = tf.keras.applications.MobileNetV3Large(
        input_shape=(img_size, img_size, 3),
        include_top=False,
        weights="imagenet",
        pooling="avg",
    )
    base.trainable = False  # freeze base initially

    x = base.output
    x = tf.keras.layers.Dense(256, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.4)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs=base.input, outputs=outputs)
    return model, base


def build_data_pipeline(data_dir: str, img_size: int, batch_size: int):
    import tensorflow as tf

    train_ds = tf.keras.utils.image_dataset_from_directory(
        os.path.join(data_dir, "train"),
        image_size=(img_size, img_size),
        batch_size=batch_size,
        label_mode="categorical",
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        os.path.join(data_dir, "val"),
        image_size=(img_size, img_size),
        batch_size=batch_size,
        label_mode="categorical",
    )

    normalise = tf.keras.layers.Rescaling(1.0 / 255)
    augment = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.1),
        tf.keras.layers.RandomZoom(0.1),
    ])

    train_ds = (
        train_ds
        .map(lambda x, y: (normalise(augment(x)), y), num_parallel_calls=tf.data.AUTOTUNE)
        .prefetch(tf.data.AUTOTUNE)
    )
    val_ds = (
        val_ds
        .map(lambda x, y: (normalise(x), y), num_parallel_calls=tf.data.AUTOTUNE)
        .prefetch(tf.data.AUTOTUNE)
    )
    return train_ds, val_ds


def export_tflite(keras_model_path: str, tflite_path: str) -> None:
    import tensorflow as tf

    converter = tf.lite.TFLiteConverter.from_saved_model(keras_model_path)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]  # int8 quantisation
    tflite_model = converter.convert()
    Path(tflite_path).write_bytes(tflite_model)
    size_kb = len(tflite_model) / 1024
    print(f"[export] TFLite model written to {tflite_path} ({size_kb:.1f} KB)")


def main():
    args = parse_args()
    import tensorflow as tf

    print(f"TensorFlow {tf.__version__} | GPU: {tf.config.list_physical_devices('GPU')}")

    train_ds, val_ds = build_data_pipeline(args.data_dir, args.img_size, args.batch_size)
    model, base = build_model(len(CLASS_NAMES), args.img_size)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(args.learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=2),
        tf.keras.callbacks.ModelCheckpoint(
            os.path.join(args.output_dir, "best_head.h5"), save_best_only=True
        ),
    ]

    print("\n=== Phase 1: Training classification head (frozen base) ===")
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=min(args.epochs, 10),
        callbacks=callbacks,
    )

    # Phase 2: Unfreeze top layers for fine-tuning
    print("\n=== Phase 2: Fine-tuning top 30 layers of MobileNetV3 ===")
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(args.learning_rate / 10),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        initial_epoch=min(args.epochs, 10),
        callbacks=callbacks,
    )

    # Save Keras model
    h5_path = os.path.join(args.output_dir, "mobilenet_v3_issue.h5")
    saved_model_path = os.path.join(args.output_dir, "mobilenet_v3_issue_saved")
    model.save(h5_path)
    model.export(saved_model_path)
    print(f"Model saved to {h5_path}")

    # Export class names
    with open(os.path.join(args.output_dir, "class_names.json"), "w") as f:
        json.dump(CLASS_NAMES, f)

    # Convert to TFLite
    tflite_path = os.path.join(args.output_dir, "mobilenet_v3_issue.tflite")
    export_tflite(saved_model_path, tflite_path)

    # Final evaluation
    loss, acc = model.evaluate(val_ds)
    print(f"\n=== Final validation accuracy: {acc*100:.2f}% ===")


if __name__ == "__main__":
    main()
