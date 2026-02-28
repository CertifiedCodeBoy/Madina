"""
Fine-tune AraBERT (aubmindlab/bert-base-arabertv2) for multilingual
intent classification in the Madina municipal assistant.

Usage:
    python fine_tune.py \
        --train_file data/intents_train.jsonl \
        --val_file   data/intents_val.jsonl   \
        --output_dir fine_tuned               \
        --epochs 5

JSONL format (one JSON object per line):
    {"text": "كيف أجدد بطاقة إقامتي؟", "label": "residency_renewal"}
    {"text": "I want to pay my electricity bill", "label": "utility_bill"}
    ...

Labels:
    residency_renewal | utility_bill | waste_schedule | parking_permit |
    birth_certificate | aqi_health | default
"""

import argparse
import json
import os
from pathlib import Path


INTENT_LABELS = [
    "residency_renewal",
    "utility_bill",
    "waste_schedule",
    "parking_permit",
    "birth_certificate",
    "aqi_health",
    "default",
]

ID2LABEL = {i: l for i, l in enumerate(INTENT_LABELS)}
LABEL2ID = {l: i for i, l in enumerate(INTENT_LABELS)}


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--train_file", type=str, default="data/intents_train.jsonl")
    p.add_argument("--val_file", type=str, default="data/intents_val.jsonl")
    p.add_argument("--base_model", type=str, default="aubmindlab/bert-base-arabertv2")
    p.add_argument("--output_dir", type=str, default="fine_tuned")
    p.add_argument("--epochs", type=int, default=5)
    p.add_argument("--batch_size", type=int, default=16)
    p.add_argument("--max_length", type=int, default=128)
    p.add_argument("--learning_rate", type=float, default=2e-5)
    return p.parse_args()


def load_jsonl(path: str):
    data = []
    with open(path) as f:
        for line in f:
            obj = json.loads(line.strip())
            data.append(obj)
    return data


def main():
    args = parse_args()

    from transformers import (
        AutoTokenizer,
        AutoModelForSequenceClassification,
        TrainingArguments,
        Trainer,
        DataCollatorWithPadding,
    )
    from datasets import Dataset
    import numpy as np
    from sklearn.metrics import accuracy_score, f1_score

    print(f"Loading base model: {args.base_model}")
    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.base_model,
        num_labels=len(INTENT_LABELS),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
    )

    # Load data
    train_data = load_jsonl(args.train_file)
    val_data = load_jsonl(args.val_file)

    def to_hf_dataset(records):
        texts = [r["text"] for r in records]
        labels = [LABEL2ID[r["label"]] for r in records]
        return Dataset.from_dict({"text": texts, "label": labels})

    train_ds = to_hf_dataset(train_data)
    val_ds = to_hf_dataset(val_data)

    def tokenize(batch):
        return tokenizer(
            batch["text"],
            truncation=True,
            max_length=args.max_length,
        )

    train_ds = train_ds.map(tokenize, batched=True)
    val_ds = val_ds.map(tokenize, batched=True)

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=-1)
        return {
            "accuracy": accuracy_score(labels, preds),
            "f1_macro": f1_score(labels, preds, average="macro"),
        }

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        report_to="none",
        logging_steps=10,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
    )

    print("\n=== Starting fine-tuning ===")
    trainer.train()

    # Save final model + tokenizer
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print(f"\nModel saved to {args.output_dir}/")

    # Evaluate
    metrics = trainer.evaluate()
    print(f"\nFinal val accuracy: {metrics['eval_accuracy']*100:.2f}%")
    print(f"Final val F1 macro: {metrics['eval_f1_macro']*100:.2f}%")


if __name__ == "__main__":
    main()
