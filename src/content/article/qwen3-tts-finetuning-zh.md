---
lang: zh
title: "Qwen3-TTS 微调完全指南：从零开始训练你自己的语音模型"
date: "2026-02-22"
desc: "想让 AI 用你的声音朗读小说？想为视频角色定制专属音色？本文将手把手教你使用 Qwen3-TTS Easy Finetuning 工具，通过微调打造一个稳定、自然、跨语言无口音的专属语音模型。"
image: "/assets/qwen3-tts-finetuning/cover.webp"
translations:
  - lang: en
    slug: qwen3-tts-finetuning-en
---

> 想让 AI 用你的声音朗读小说？想为视频角色定制专属音色？  
> 本文将手把手教你使用 **Qwen3-TTS Easy Finetuning** 工具，通过微调打造一个稳定、自然、跨语言无口音的专属语音模型。

---

Read this article in English: [Qwen3-TTS Fine-tuning Complete Guide: Train Your Own Voice Model from Scratch](/article/qwen3-tts-finetuning-en)

## 为什么你需要微调，而不是仅仅用零样本克隆？

最近 AI 语音克隆非常火爆，你或许听说过“只需几秒钟音频就能克隆任何人的声音”。这种技术叫 **零样本语音克隆（Zero-shot TTS）**，确实方便快捷。但它有一个致命缺陷：**稳定性差**。同一句话生成两次，音色可能忽远忽近；说不同句子时，声音甚至会“飘”成另一个人。

尽管Qwen3-TTS的零样本克隆效果已经很不错了，能过避免以上很多问题，但是还是存在一些不足，比如

- 跨语言带有母语口音
- 语调不够自然
- 情感表达不够丰富
- 慢

如果你只是想随便玩玩，零样本克隆或许够用。但如果你希望：

- 用固定的声音长期制作视频、播客；
- 让角色在不同场景下保持一致的语调；
- 用中文说话人的模型说英文，听起来像地道老外；

那么你需要的是 **微调（Fine-tuning）**。

微调相当于让 AI 深度学习目标说话人的所有发音细节，最终得到一个 **单说话人模型** —— 它只擅长模仿这一个声音，但能做到 **极其稳定、自然，并且能理解自然语言中的情绪和语速指示**（比如“用悲伤的语气说”、“加快语速”）。

> ⚠️ **重要提示**：微调后的模型不再是“克隆模型”，而是一个**固定的声音模型**。它无法像零样本克隆那样随时切换成另一个人。如果你需要多角色配音，可以针对每个角色分别微调一个模型，然后切换使用。

请持续关注本项目，后续会发布多说话人微调功能。

---

## 什么是 Qwen3-TTS Easy Finetuning？

这是我开发的一个开箱即用的工具包，基于阿里巴巴通义实验室最新开源的 **Qwen3-TTS** 模型，帮你省去代码编写和环境配置的烦恼，通过图形化界面（WebUI）或简单命令，就能完成从原始音频到专属语音模型的全部流程。

- **一键式操作**：音频分割、自动转录（ASR）、数据清洗、编码、训练，全流程自动化。
- **现代化 WebUI**：基于 Gradio 构建，操作直观，实时显示进度。
- **内置优化配置**：针对 0.6B 和 1.7B 两种模型大小，提供已验证的训练参数。
- **Docker 支持**：一键启动，无需手动安装依赖。

---

## 准备工作：你需要什么？

- 一台带有 **NVIDIA GPU** 的电脑（建议显存 ≥ 8GB，微调 1.7B 模型需要 ≥ 16GB）
- 目标说话人的 **纯净录音**（建议 10～30 分钟，wav 格式，背景噪音越小越好）
- 基本的命令行操作能力（会复制粘贴即可）
- （可选）对 Docker 的了解，或者直接使用 Python 虚拟环境

---

## 第一步：安装与启动

### 方法一：使用 Docker（推荐，省心）

```bash
# 克隆仓库（等公开后执行）
git clone https://github.com/mozi1924/Qwen3-TTS-EasyFinetuning.git
cd Qwen3-TTS-EasyFinetuning

# 启动容器
docker compose up -d
```

第一次启动会自动下载镜像（约 10GB），稍等片刻。成功后，打开浏览器访问 `http://localhost:7860`，你将看到漂亮的 WebUI 界面。

### 方法二：使用 Python 虚拟环境（适合开发者）

```bash
# 克隆仓库
git clone https://github.com/mozi1924/Qwen3-TTS-EasyFinetuning.git
cd Qwen3-TTS-EasyFinetuning

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt
pip install flash-attn==2.8.3 --no-build-isolation  # 可选，加速训练

# 启动 WebUI
python src/webui.py
```

启动后同样访问 `http://localhost:7860`。

---

## 第二步：使用 WebUI 进行微调（图文详解）

WebUI 分为三个主要标签页，我们一步步操作。

### 📁 标签页 1：数据准备（Data Preparation）

#### 1.1 上传原始音频

将你的录音文件（`.wav`）放入一个文件夹，例如 `/home/me/my_voice/`。如果你用 Docker，需要把文件夹挂载到容器内，默认已挂载当前目录下的 `raw-dataset` 文件夹，你可以直接把音频放进去。

你可以指定一个`ref.wav`作为参考音频在`raw-dataset`文件夹下，并修改Reference Audio Path为`raw-dataset/ref.wav`，用于后续训练音色参考，使得结果更加稳定，程序会自动重采样为 24kHz。如果没有请把这里留空。

#### 1.2 运行 Step 1：音频分割

![Step-1](/assets/qwen3-tts-finetuning/step-1.webp)

在 WebUI 中：

- **Speaker Name**：输入一个名字标识你的说话人，例如 `my_speaker`。
- **Raw WAVs Directory**：输入存放原始音频的路径，Docker 默认为 `/workspace/raw-dataset`。
- **Reference Audio Path**：可选，提供一个参考音频（如 5 秒的干净语音），用于后续音色参考，程序会自动重采样为 24kHz。
- 点击 **Run Step 1**。

程序会分析音频，自动切除静音片段，将长音频切分为短句，并统一采样率为 24kHz。完成后，你会在 `final-dataset/my_speaker/audio_24k/` 看到处理好的音频片段。

#### 1.3 运行 Step 2：ASR 转录

![Step-2](/assets/qwen3-tts-finetuning/step-2.webp)

这一步用 ASR 模型自动识别每个音频片段的内容，生成文本标注。

- **ASR Model**：选择 `Qwen/Qwen3-ASR-1.7B`（精度高，稍慢）或 `0.6B`（更快，精度稍低）。
- **Download Source**：选择 ModelScope（国内快）或 HuggingFace（国际快）。
- **GPU Device**：选择用于 ASR 的 GPU（如 `cuda:0`）。
- 点击 **Run Step 2**。

等待进度条走完，你会得到 `final-dataset/my_speaker/tts_train.jsonl`，每一行是 `{"audio": "路径", "text": "识别出的文字"}`。

---

### 🏋️ 标签页 2：训练（Training）

#### 2.1 选择或新建实验

![Step-0](/assets/qwen3-tts-finetuning/step-0.webp)

- **Experiment Name**：输入一个名字，例如 `my_first_voice`。如果之前训练过，可以从下拉框选择，配置会自动加载。
- **Select Target Speaker Data**：确认是你的数据集。
- **Initial Model**：选择基础模型，`Qwen/Qwen3-TTS-12Hz-0.6B-Base`（显存要求低）或 `1.7B`（效果更好）。点击 **Check / Download Model** 可预先下载。

#### 2.2 运行 Step 3：数据 Tokenization

切换到 **Training** 标签页，先别急，我们要继续完成数据编码。

![Step-3](/assets/qwen3-tts-finetuning/step-3.webp)

- **Select Target Speaker Data**：选择你的数据集 `my_speaker`。
- **GPU Device for Tokenization**：选择 GPU。
- 点击 **Tokenize Data**。

这一步会使用 Qwen3-TTS 的专用 Tokenizer 将音频转换为离散编码，输出 `tts_train_with_codes.jsonl`，这是最终用于训练的文件。

#### 2.3 设置训练参数

- **Training Preset**：根据模型大小选择对应预设，系统会自动填入推荐的学习率、批次大小等。你也可以展开 **Advanced Training Options** 手动调整。
- **GPU Device for Training**：选择训练用的 GPU。
- **Use Experimental Training Method**：可选，启用多核 CPU 辅助加速（实验性）。

#### 2.4 开始训练

![Step-4](/assets/qwen3-tts-finetuning/step-4.webp)

点击 **Start Training**，下方日志区会实时显示训练进度和损失值。训练过程中可以随时打开 Tensorboard 监控（点击 **Jump to Tensorboard**）。

训练时长取决于数据量和模型大小，一般 10～30 分钟音频，在 10GB 显存上训练 0.6B 模型 2～3 个 epoch 大约需要 1～2 小时。

训练完成后，模型检查点会保存在 `output/my_first_voice/` 目录下，例如 `checkpoint-epoch-2`。

---

### 🎧 标签页 3：推理测试（Inference）

#### 3.1 加载检查点

![Step-5](/assets/qwen3-tts-finetuning/step-5.webp)

- **Select Checkpoint**：选择你刚刚训练好的检查点文件夹。
- **Speaker Name**：会自动填充为数据集名，一般不需要改。
- **Text to Synthesize**：输入你想测试的文本，可以是中文、英文或混合。
- **GPU Device**：选择推理用的 GPU。

#### 3.2 生成音频

点击 **Synthesize Audio**，稍等片刻，下方会播放生成的语音。如果效果满意，恭喜你，你的专属语音模型诞生了！

如果显存不足，可以点击 **Unload Model from VRAM** 释放显存。

---

## 进阶技巧：如何让模型效果更好？

- **数据质量 > 数据量**：10 分钟干净、情感丰富的录音，远胜于 1 小时嘈杂的录音。
- **避免背景音乐**：ASR 转录会受音乐干扰，导致文本错误。
- **适当增加 epoch**：如果声音不像，可以尝试增加到 5～10 个 epoch，但要注意过拟合（声音僵硬）。
- **调整学习率**：预设学习率通常合适，如果 loss 震荡，可以适当降低。

---

## 常见问题

**Q：我没有 GPU，能用 CPU 训练吗？**  
A：可以，但极其缓慢（可能训练一个模型需要几天）。建议使用云 GPU 实例，如 AutoDL、Colab 等。（广告商请联系我，我把这里换成你的广告）

**Q：训练时显存不足怎么办？**  
A：减小 `batch_size`，增加 `gradient_accumulation_steps`，或者换用 0.6B 模型。

**Q：我只有 1 分钟音频，能微调吗？**  
A：可以，但效果可能不稳定。建议至少收集 5 分钟以上。

**Q：微调后还能零样本克隆其他人吗？**  
A：不能。微调后的模型专属于你训练的说话人。若需多角色，请分别微调多个模型，后期等待Qwen官方更新发布多说话人微调功能，本项目也会同步更新。

**Q：生成的语音有电流声/杂音？**  
A：检查原始音频质量，训练数据中不要有底噪。可以在 Step 1 之前先用 UVR5 等工具降噪。

---

## 结语

通过本文的指导，你应该已经掌握了如何使用 Qwen3-TTS Easy Finetuning 微调自己的语音模型。这个工具将复杂的 AI 训练流程封装成简单的几步，让每个人都能拥有属于自己的 AI 声音。

如果你在操作中遇到任何问题，欢迎在 GitHub 仓库提交 Issue。也欢迎你分享微调后的成果！和社区分享你的经验，共同进步。

> **项目地址**：[https://github.com/mozi1924/Qwen3-TTS-EasyFinetuning](https://github.com/mozi1924/Qwen3-TTS-EasyFinetuning)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=mozi1924/Qwen3-TTS-EasyFinetuning&type=date&legend=top-left)](https://www.star-history.com/#mozi1924/Qwen3-TTS-EasyFinetuning&type=date&legend=top-left)

---
