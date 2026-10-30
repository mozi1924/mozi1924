import type { Project } from "../types";

export const pinnedProjects: Project[] = [
  {
    name: "MoziToolKit",
    slug: "mozitoolkit",
    pinned: true,
    pinnedOrder: 1,
    description: "面向 Blender 5.0+ (LTS) 的高性能 Minecraft 资产处理、规范 PBR 着色器管线与实时协同插件前端。由 libmozitoolkit (Rust) 驱动，配合 Yefira 模组实现双向 Live Sync。",
    repoUrl: "https://github.com/mozi1924/MoziToolKit",
    homepage: "https://mozi1924.com/blogs/from-mozitoolkit-to-libmozitoolkit",
    image: "/images/projects/mozitoolkit.webp",
    stars: 2,
    forks: 0,
    language: "Python",
    topics: [
      "blender",
      "blender-addon",
      "libmozitoolkit",
      "live-sync",
      "minecraft",
      "pbr",
      "rust"
    ],
    license: "GPL-3.0",
    createdAt: "2026-07-31T14:49:09Z",
    pushedAt: "2026-10-30T14:28:00Z",
    archived: false
  },
  {
    name: "rig2_addons",
    slug: "rig2_addons",
    pinned: true,
    pinnedOrder: 2,
    description: "The BEST Blender Minecraft Rig addons mozi ever made. 次时代模块化角色形变与动画驱动生态系统。",
    repoUrl: "https://github.com/mozi1924/rig2_addons",
    homepage: "https://mozi1924.com/mozi-rig",
    image: "/images/projects/rig2.webp",
    stars: 2,
    forks: 0,
    language: "Python",
    topics: [
      "blender-addon",
      "blender-plugin",
      "blender3d",
      "rigging",
      "minecraft"
    ],
    license: "GPL-3.0",
    createdAt: "2026-02-22T16:50:48Z",
    pushedAt: "2026-06-24T11:46:06Z",
    archived: false
  },
  {
    name: "Qwen3-TTS-EasyFinetuning",
    slug: "qwen3-tts-easyfinetuning",
    pinned: true,
    pinnedOrder: 3,
    description: "Easy fine-tuning for Qwen3-TTS: Fast voice cloning and high-quality multilingual speech synthesis.",
    repoUrl: "https://github.com/mozi1924/Qwen3-TTS-EasyFinetuning",
    homepage: "https://mozi1924.com/article/qwen3-tts-finetuning-zh",
    image: "/images/projects/qwen3-tts.webp",
    stars: 129,
    forks: 25,
    language: "Python",
    topics: [
      "ai",
      "speech-synthesis",
      "text-to-speech",
      "voice-cloning",
      "qwen3-tts"
    ],
    license: "Apache-2.0",
    createdAt: "2026-02-21T12:30:24Z",
    pushedAt: "2026-05-29T20:44:47Z",
    archived: false
  },
  {
    name: "openblive",
    slug: "openblive",
    pinned: true,
    pinnedOrder: 4,
    description: "B站 / 哔哩哔哩直播开播助手，支持 OBS 开播联动、直播姬工作流补充、多账号管理、弹幕互动、房间管理与 Overlay 接入",
    repoUrl: "https://github.com/mozi1924/openblive",
    homepage: "https://mozi1924.com/blogs/openblive-studio/",
    image: "/images/projects/openblive.webp",
    stars: 9,
    forks: 1,
    language: "TypeScript",
    topics: [
      "bilibili-live",
      "obs-studio",
      "overlay",
      "stream-management",
      "tauri"
    ],
    license: "MIT",
    createdAt: "2026-05-19T08:40:31Z",
    pushedAt: "2026-08-07T12:38:19Z",
    archived: false
  }
];
