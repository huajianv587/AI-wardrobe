from __future__ import annotations

import argparse
import json
from pathlib import Path

from datasets import DatasetDict, load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stage-1 QLoRA trainer for AI Wardrobe llm-recommender.")
    parser.add_argument("--model-name", default="Qwen/Qwen2.5-7B-Instruct")
    parser.add_argument("--train-file", default="model_training/datasets/llm-recommender/train.jsonl")
    parser.add_argument("--eval-file", default="model_training/datasets/llm-recommender/eval.jsonl")
    parser.add_argument("--output-dir", default="model_training/checkpoints/llm-recommender")
    parser.add_argument("--max-seq-length", type=int, default=2048)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--num-train-epochs", type=float, default=3.0)
    parser.add_argument("--per-device-train-batch-size", type=int, default=4)
    parser.add_argument("--per-device-eval-batch-size", type=int, default=2)
    parser.add_argument("--gradient-accumulation-steps", type=int, default=8)
    parser.add_argument("--warmup-steps", type=int, default=100)
    parser.add_argument("--logging-steps", type=int, default=10)
    parser.add_argument("--save-steps", type=int, default=100)
    parser.add_argument("--eval-steps", type=int, default=100)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--load-in-4bit", action="store_true", default=True)
    parser.add_argument("--load-in-8bit", action="store_true")
    parser.add_argument("--fp16", action="store_true")
    parser.add_argument("--bf16", action="store_true", default=True)
    return parser.parse_args()


def build_prompt(example: dict) -> str:
    instruction = example.get("instruction", "").strip()
    input_payload = json.dumps(example.get("input", {}), ensure_ascii=False, indent=2)
    output_payload = json.dumps(example.get("output", {}), ensure_ascii=False, indent=2)

    return (
        "<|im_start|>system\n"
        "You are AI Wardrobe's outfit recommendation assistant. Return grounded, product-ready outfit reasoning.\n"
        "<|im_end|>\n"
        "<|im_start|>user\n"
        f"{instruction}\n\nInput:\n{input_payload}\n"
        "<|im_end|>\n"
        "<|im_start|>assistant\n"
        f"{output_payload}\n"
        "<|im_end|>\n"
    )


def load_jsonl_datasets(train_file: str, eval_file: str) -> DatasetDict:
    data_files = {"train": train_file, "eval": eval_file}
    return load_dataset("json", data_files=data_files)


def main() -> None:
    args = parse_args()

    if args.load_in_4bit and args.load_in_8bit:
        raise ValueError("Choose either --load-in-4bit or --load-in-8bit, not both.")

    train_path = Path(args.train_file)
    eval_path = Path(args.eval_file)
    if not train_path.exists():
        raise FileNotFoundError(f"Missing train file: {train_path}")
    if not eval_path.exists():
        raise FileNotFoundError(f"Missing eval file: {eval_path}")

    dataset = load_jsonl_datasets(args.train_file, args.eval_file)

    tokenizer = AutoTokenizer.from_pretrained(args.model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    quantization_config = None
    if args.load_in_4bit:
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype="bfloat16" if args.bf16 else "float16",
        )
    elif args.load_in_8bit:
        quantization_config = BitsAndBytesConfig(load_in_8bit=True)

    model = AutoModelForCausalLM.from_pretrained(
        args.model_name,
        trust_remote_code=True,
        quantization_config=quantization_config,
        device_map="auto",
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)
    model.gradient_checkpointing_enable()

    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=["q_proj", "v_proj"],
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)

    def preprocess(example: dict) -> dict:
        text = build_prompt(example)
        tokenized = tokenizer(
            text,
            max_length=args.max_seq_length,
            padding="max_length",
            truncation=True,
        )
        tokenized["labels"] = list(tokenized["input_ids"])
        return tokenized

    tokenized_dataset = dataset.map(preprocess, remove_columns=dataset["train"].column_names)

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        learning_rate=args.learning_rate,
        num_train_epochs=args.num_train_epochs,
        per_device_train_batch_size=args.per_device_train_batch_size,
        per_device_eval_batch_size=args.per_device_eval_batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        warmup_steps=args.warmup_steps,
        logging_steps=args.logging_steps,
        save_steps=args.save_steps,
        eval_steps=args.eval_steps,
        evaluation_strategy="steps",
        save_strategy="steps",
        report_to="none",
        bf16=args.bf16,
        fp16=args.fp16 and not args.bf16,
        remove_unused_columns=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["eval"],
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
        tokenizer=tokenizer,
    )

    trainer.train()
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print(f"Saved checkpoint to {args.output_dir}")


if __name__ == "__main__":
    main()
