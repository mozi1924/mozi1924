---
lang: en
title: "Qwen3-TTS Fine-tuning Complete Guide: Train Your Own Voice Model from Scratch"
date: "2026-02-22"
desc: "Want AI to read novels with your voice? Need a custom voice for video characters? This article provides a step-by-step guide to using the Qwen3-TTS Easy Finetuning tool to create a stable, natural, cross-lingual, accent-free专属 voice model."
image: "/assets/qwen3-tts-finetuning-en/cover.webp"
---

> Want AI to read novels with your voice? Need a custom voice for video characters?
> This article provides a step-by-step guide to using the **Qwen3-TTS Easy Finetuning** tool to create a stable, natural, cross-lingual, accent-free专属 voice model through fine-tuning.

---

## Why You Need Fine-tuning, Not Just Zero-shot Cloning?

AI voice cloning has become very popular recently. You might have heard of "cloning anyone's voice with just a few seconds of audio." This technology is called **Zero-shot TTS**, and it's indeed convenient and fast. But it has a fatal flaw: **instability**. Generating the same sentence twice might result in voices that sound distant or close; when speaking different sentences, the voice might even "drift" into sounding like another person.

Although Qwen3-TTS's zero-shot cloning works quite well, avoiding many of the issues mentioned above, it still has some shortcomings, such as:

- Cross-lingual output carries a native accent
- Intonation is not natural enough
- Emotional expression lacks richness
- Slow

If you're just experimenting casually, zero-shot cloning might suffice. But if you want to:

- Use a fixed voice for long-term video or podcast production;
- Ensure a character maintains consistent tone across different scenes;
- Have a model trained on a Chinese speaker sound like a native when speaking English;

Then you need **Fine-tuning**.

Fine-tuning is like letting the AI deeply learn all the pronunciation details of the target speaker, ultimately resulting in a **single-speaker model** — it specializes in imitating only this one voice, but achieves **extreme stability, naturalness, and the ability to understand emotional and speed instructions in natural language** (e.g., "say this in a sad tone," "speed up").

> ⚠️ **Important Note**: The fine-tuned model is no longer a "cloning model" but a **fixed voice model**. It cannot switch to another person instantly like zero-shot cloning. If you need multi-voice dubbing, you can fine-tune one model for each character and switch between them.

Please stay tuned to this project; multi-speaker fine-tuning functionality will be released later.

---

## What is Qwen3-TTS Easy Finetuning?

This is an out-of-the-box toolkit I developed, based on the latest open-source **Qwen3-TTS** model from Alibaba's Tongyi Lab. It saves you from code writing and environment configuration hassles, allowing you to complete the entire process from raw audio to a专属 voice model through a graphical interface (WebUI) or simple commands.

- **One-click Process**: Audio segmentation, automatic transcription (ASR), data cleaning, encoding, training — fully automated.
- **Modern WebUI**: Built with Gradio, intuitive operation, real-time progress display.
- **Built-in Optimized Configurations**: Provides validated training parameters for 0.6B and 1.7B model sizes.
- **Docker Support**: One-click launch, no manual dependency installation required.

---

## Preparation: What You Need?

- A computer with an **NVIDIA GPU** (Recommended VRAM ≥ 8GB, fine-tuning the 1.7B model requires ≥ 16GB)
- **Clean recordings** of the target speaker (Recommended 10–30 minutes, wav format, minimal background noise)
- Basic command-line skills (copy-paste is enough)
- (Optional) Familiarity with Docker, or using a Python virtual environment

---

## Step 1: Installation and Startup

### Method 1: Using Docker (Recommended, Hassle-free)

```bash
# Clone the repository (execute after it's public)
git clone https://github.com/mozi1924/Qwen3-TTS-EasyFinetuning.git
cd Qwen3-TTS-EasyFinetuning

# Start the container
docker compose up -d
```

The first start will automatically download the image (~10GB). Wait a moment. Once successful, open your browser and visit `http://localhost:7860` to see the beautiful WebUI.

### Method 2: Using Python Virtual Environment (Suitable for Developers)

```bash
# Clone the repository
git clone https://github.com/mozi1924/Qwen3-TTS-EasyFinetuning.git
cd Qwen3-TTS-EasyFinetuning

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
pip install flash-attn==2.8.3 --no-build-isolation  # Optional, accelerates training

# Start WebUI
python src/webui.py
```

After startup, also visit `http://localhost:7860`.

---

## Step 2: Fine-tuning with the WebUI (Detailed Guide with Screenshots)

The WebUI is divided into three main tabs. Let's go through them step-by-step.

### 📁 Tab 1: Data Preparation

#### 1.1 Upload Raw Audio

Place your recording files (`.wav`) into a folder, e.g., `/home/me/my_voice/`. If using Docker, you need to mount the folder into the container. The current directory's `raw-dataset` folder is mounted by default; you can directly put your audio there.

You can specify a `ref.wav` as a reference audio in the `raw-dataset` folder and set the Reference Audio Path to `raw-dataset/ref.wav`. This will be used as a timbre reference during subsequent training, making results more stable. The program will automatically resample it to 24kHz. Leave it blank if you don't have one.

#### 1.2 Run Step 1: Audio Segmentation

![Step-1](/assets/qwen3-tts-finetuning-en/step-1.webp)

In the WebUI:
- **Speaker Name**: Enter a name to identify your speaker, e.g., `my_speaker`.
- **Raw WAVs Directory**: Enter the path to the raw audio. For Docker, default is `/workspace/raw-dataset`.
- **Reference Audio Path**: Optional. Provide a reference audio (e.g., 5 seconds of clean voice) for timbre reference. The program will automatically resample it to 24kHz.
- Click **Run Step 1**.

The program will analyze the audio, automatically remove silent segments, split long audio into short sentences, and unify the sample rate to 24kHz. After completion, you'll find the processed audio clips in `final-dataset/my_speaker/audio_24k/`.

#### 1.3 Run Step 2: ASR Transcription

![Step-2](/assets/qwen3-tts-finetuning-en/step-2.webp)

This step uses an ASR model to automatically recognize the content of each audio clip and generate text annotations.

- **ASR Model**: Choose `Qwen/Qwen3-ASR-1.7B` (higher accuracy, slightly slower) or `0.6B` (faster, slightly lower accuracy).
- **Download Source**: Choose ModelScope (faster in China) or HuggingFace (faster internationally).
- **GPU Device**: Select the GPU for ASR (e.g., `cuda:0`).
- Click **Run Step 2**.

Wait for the progress bar to complete. You will get `final-dataset/my_speaker/tts_train.jsonl`, where each line is `{"audio": "path", "text": "recognized text"}`.

---

### 🏋️ Tab 2: Training

#### 2.1 Select or Create a New Experiment

![Step-0](/assets/qwen3-tts-finetuning-en/step-0.webp)

- **Experiment Name**: Enter a name, e.g., `my_first_voice`. If you've trained before, you can select it from the dropdown, and the configuration will load automatically.
- **Select Target Speaker Data**: Confirm it's your dataset.
- **Initial Model**: Choose the base model, `Qwen/Qwen3-TTS-12Hz-0.6B-Base` (lower VRAM requirement) or `1.7B` (better performance). Click **Check / Download Model** to pre-download if needed.

#### 2.2 Run Step 3: Data Tokenization

Switch to the **Training** tab. Hold on, we need to complete data encoding first.

![Step-3](/assets/qwen3-tts-finetuning-en/step-3.webp)

- **Select Target Speaker Data**: Choose your dataset `my_speaker`.
- **GPU Device for Tokenization**: Select the GPU.
- Click **Tokenize Data**.

This step uses Qwen3-TTS's specialized Tokenizer to convert audio into discrete codes, outputting `tts_train_with_codes.jsonl`. This is the final file used for training.

#### 2.3 Set Training Parameters

- **Training Preset**: Select the corresponding preset based on the model size. The system will automatically fill in recommended learning rates, batch sizes, etc. You can also expand **Advanced Training Options** to adjust manually.
- **GPU Device for Training**: Select the GPU for training.
- **Use Experimental Training Method**: Optional. Enable multi-core CPU-assisted acceleration (experimental).

#### 2.4 Start Training

![Step-4](/assets/qwen3-tts-finetuning-en/step-4.webp)

Click **Start Training**. The log area below will display real-time training progress and loss values. You can open Tensorboard anytime during training to monitor progress (click **Jump to Tensorboard**).

Training duration depends on data size and model size. Typically, for 10–30 minutes of audio, training a 0.6B model for 2–3 epochs on 10GB VRAM takes about 1–2 hours.

After training, model checkpoints are saved in the `output/my_first_voice/` directory, e.g., `checkpoint-epoch-2`.

---

### 🎧 Tab 3: Inference Testing

#### 3.1 Load Checkpoint

![Step-5](/assets/qwen3-tts-finetuning-en/step-5.webp)

- **Select Checkpoint**: Choose the checkpoint folder you just trained.
- **Speaker Name**: This will auto-fill with the dataset name, usually no need to change.
- **Text to Synthesize**: Enter the text you want to test. Can be Chinese, English, or mixed.
- **GPU Device**: Select the GPU for inference.

#### 3.2 Generate Audio

Click **Synthesize Audio**. Wait a moment, and the generated speech will play below. If the result is satisfactory, congratulations, your专属 voice model is born!

If you encounter VRAM issues, you can click **Unload Model from VRAM** to free up memory.

---

## Advanced Tips: How to Get Better Results?

- **Data Quality > Data Quantity**: 10 minutes of clean, emotionally rich recordings are far better than 1 hour of noisy recordings.
- **Avoid Background Music**: ASR transcription can be disturbed by music, leading to text errors.
- **Increase Epochs Appropriately**: If the voice doesn't sound like the target, try increasing to 5–10 epochs, but be cautious of overfitting (voice becoming rigid).
- **Adjust Learning Rate**: The preset learning rate is usually suitable. If loss oscillates, consider lowering it slightly.

---

## Frequently Asked Questions

**Q: I don't have a GPU, can I train with CPU?**  
A: Yes, but it will be extremely slow (training a model might take days). Consider using cloud GPU instances like AutoDL, Colab, etc. (Advertisers, please contact me to place your ad here.)

**Q: What if I run out of VRAM during training?**  
A: Reduce `batch_size`, increase `gradient_accumulation_steps`, or switch to the 0.6B model.

**Q: I only have 1 minute of audio, can I fine-tune?**  
A: Yes, but the results might be unstable. It's recommended to collect at least 5 minutes.

**Q: Can I still zero-shot clone others after fine-tuning?**  
A: No. The fine-tuned model is dedicated to the speaker you trained it on. For multiple characters, please fine-tune separate models and wait for the official Qwen multi-speaker fine-tuning feature release; this project will also be updated accordingly.

**Q: The generated speech has buzzing/noise?**  
A: Check the quality of your original audio. Ensure the training data has no background noise. You can use tools like UVR5 for noise reduction before Step 1.

---

## Conclusion

Following this guide, you should now know how to use Qwen3-TTS Easy Finetuning to fine-tune your own voice model. This tool encapsulates the complex AI training process into a few simple steps, allowing everyone to have their own AI voice.

If you encounter any issues during the process, please submit an Issue on the GitHub repository. You are also welcome to share your fine-tuned results! Share your experiences with the community and progress together.

> **Project Address**: [https://github.com/mozi1924/Qwen3-TTS-EasyFinetuning](https://github.com/mozi1924/Qwen3-TTS-EasyFinetuning)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=mozi1924/Qwen3-TTS-EasyFinetuning&type=date&legend=top-left)](https://www.star-history.com/#mozi1924/Qwen3-TTS-EasyFinetuning&type=date&legend=top-left)

---