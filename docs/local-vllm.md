# Local vLLM Setup

Use this when you want the first recognition layer to run on your own local vLLM service before falling back to OpenAI and DeepSeek.

Important:

- for this project's image-understanding flow, your local model must be multimodal
- `Qwen/Qwen2.5-7B-Instruct` is text-only and is not suitable for the local first layer
- use a vision-capable model such as `Qwen/Qwen2.5-VL-7B-Instruct`
- if your current machine has no GPU and you do not want slow CPU-only inference, keep `VLLM_BASE_URL` empty for now
- in that case the backend will skip the local first layer and fall through to `OpenAI -> DeepSeek`

## What The Backend Expects

The backend expects an OpenAI-compatible endpoint:

```env
VLLM_BASE_URL=http://127.0.0.1:8001/v1
QWEN_MODEL_NAME=Qwen2.5-7B-Instruct
```

The recognition chain is:

1. local vLLM
2. retry once
3. OpenAI
4. retry once
5. DeepSeek

## Recommended `.env` Values

```env
VLLM_HOST=127.0.0.1
VLLM_PORT=8001
VLLM_MODEL=Qwen/Qwen2.5-VL-7B-Instruct
VLLM_MAX_MODEL_LEN=8192
VLLM_CPU_KVCACHE_SPACE=40
VLLM_CPU_NUM_OF_RESERVED_CPU=1
VLLM_BASE_URL=
QWEN_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
```

When you later deploy to a GPU machine, set:

```env
VLLM_BASE_URL=http://127.0.0.1:8001/v1
```

## Start Command

On Linux / WSL / a CPU-only environment with `vllm` already installed:

```bash
export VLLM_CPU_KVCACHE_SPACE=40
export VLLM_CPU_NUM_OF_RESERVED_CPU=1
python -m vllm.entrypoints.openai.api_server \
  --host 0.0.0.0 \
  --port 8001 \
  --model Qwen/Qwen2.5-VL-7B-Instruct \
  --max-model-len 8192 \
  --dtype bfloat16 \
  --limit-mm-per-prompt image=1
```

On this repo's Windows side, you can also use:

```bash
install-vllm-wsl.cmd
start-vllm.cmd
```

Recommended order:

1. run `install-vllm-wsl.cmd`
2. run `start-vllm.cmd`

`start-vllm.cmd` will try to launch the same command through WSL and targets:

```env
VLLM_BASE_URL=http://127.0.0.1:8001/v1
```

If you want to serve a local checkpoint directory instead of a Hub model id:

```bash
python -m vllm.entrypoints.openai.api_server \
  --host 0.0.0.0 \
  --port 8001 \
  --model /path/to/your/local/model
```

## Health Checks

After startup, these should work:

```bash
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/v1/models
```

You can also run the repo's masked runtime check:

```bash
set PYTHONPATH=backend&& backend\.venv\Scripts\python.exe backend\scripts\runtime_check.py
```

If both are reachable, the backend can use:

```env
VLLM_BASE_URL=http://127.0.0.1:8001/v1
```

## Important Notes

- vLLM CPU is supported on Linux; Windows native is not supported, so WSL is the right direction here.
- CPU-only vLLM is possible, but it will be much slower than a GPU setup.
- a 7B multimodal model on CPU can have very high latency and memory pressure; this is a practical tradeoff, not a code bug.
- `VLLM_BASE_URL` must point to the OpenAI-compatible `/v1` root, not just the host.
- `QWEN_MODEL_NAME` should match the model name your vLLM server is actually serving.
