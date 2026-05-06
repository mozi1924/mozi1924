---
layout: ../../layouts/BlogPost.astro
title: "Rig2 Remake 系统流程图"
date: "2026-05-07"
desc: "Rig2 Remake 系统的分层结构、属性总线、驱动求值等详细流程图。"
pageType: "article"
---



# Rig2 Remake System Flowcharts


## 1. 总体分层图

```mermaid
flowchart TD
    A["User Controls / Anim Inputs"] --> B["Property Layer: prop.misc, prop.limbs, prop.head, prop.prop, stature.prop, Face_BlendShapes"]
    B --> C["Compute Layer: logic (125 custom props)"]
    C --> D["Driver Targets"]

    D --> D1["Pose Constraints (852)"]
    D --> D2["Modifier Channels (76 driven channels)"]
    D --> D3["ShapeKeyData on Lattice (56 drivers)"]
    D --> D4["Bone Collection Visibility (32)"]
    D --> D5["Geometry Nodes Inputs (AIO Limbs)"]
    D --> D6["B-Bone Easing / Bone Params"]

    D1 --> E["Final Pose"]
    D2 --> E2["Mesh/Lattice Visibility + Deform Stack"]
    D3 --> E3["Lattice Deformation"]
    D5 --> E4["Geo Attribute Processing"]

    E --> F["Viewport / Render Output"]
    E2 --> F
    E3 --> F
    E4 --> F
```

## 2. 属性总线与驱动求值

```mermaid
flowchart LR
    A["prop.* bones"] --> B["logic: scripted + average drivers"]
    A2["Face_BlendShapes"] --> B
    A3["stature.prop"] --> B

    B --> C1["Constraint Influence"]
    B --> C2["Constraint Limits / Transform Ranges"]
    B --> C3["Modifier Threshold / Strength / Show"]
    B --> C4["ShapeKey Value / Mute"]
    B --> C5["Collection is_visible"]
    B --> C6["Geo Nodes math input"]

    C1 --> D["Rig behavior switching"]
    C2 --> D
    C3 --> D
    C4 --> D
    C5 --> D
    C6 --> D
```

## 3. 四肢模式切换（IK / FK / Fancy / MI）

```mermaid
flowchart TD
    A["prop.limbs: arm-L-fk-ik, leg-L-fk-ik, ik-stretch.*, arm-world-ik..."] --> B["logic derived states"]

    B --> B1["is_arm_ik / is_arm_fk"]
    B --> B2["is_leg_ik / is_leg_fk"]
    B --> B3["feet_style -> ankle-ik / fancy_feet / disable_fancy"]
    B --> B4["ik-stretch.arm.* / leg_stretch.* / fancy_leg_stretch.*"]
    B --> B5["show_mi / mi_mapping_mode"]

    B1 --> C1["arm.upper/lower constraints blend"]
    B2 --> C2["leg.upper/lower constraints blend"]
    B3 --> C3["ankle / fancy feet constraints"]
    B4 --> C4["Stretch To / Copy Transforms channels"]
    B5 --> C5["MI mapping constraints + collection visibility"]

    C1 --> D["Final limb pose"]
    C2 --> D
    C3 --> D
    C4 --> D
    C5 --> D
```

## 4. Lattice + ShapeKey 修正链

```mermaid
flowchart LR
    A["Bone Rotations (TRANSFORMS vars)"] --> B["ShapeKeyData on Lattice key_blocks"]
    A2["logic bend/fancy props"] --> B
    A3["stature.prop"] --> B

    B --> C["Lattice Objects (91 total, 27 with shape keys)"]
    C --> D["Mesh Lattice Modifiers (126)"]
    D --> E["Corrective Deformation Output"]
```

## 5. Curve + Hook + Spline IK 柔性链

```mermaid
flowchart TD
    A["Tweak Bones (arm.tweak.*, leg.tweak.*)"] --> B["Hook Modifiers on Curves (28)"]
    B --> C["Arm/Leg Curves (8)"]
    C --> D["Spline IK Constraints (12)"]
    D --> E["Spline Bone Chains"]
    E --> F["Secondary smooth motion / bend continuity"]
```

## 6. 面部系统（Face_BlendShapes -> 约束网络）

```mermaid
flowchart TD
    A["Face_BlendShapes (52 props)"] --> B["Drivers to facial constraint influences"]

    B --> C1["Mouth BS bones"]
    B --> C2["Eye BS bones"]
    B --> C3["Eyebrow BS bones"]
    B --> C4["Teeth / Tongue channels"]
    B --> C5["Pupil panel / eye look channels"]

    C1 --> D["Facial pose output"]
    C2 --> D
    C3 --> D
    C4 --> D
    C5 --> D

    E["logic: face_cap, mouth_shape, jaw, lash_style..."] --> B
```

## 7. Geometry Nodes 链路（AIO Limbs）

```mermaid
flowchart LR
    A["Mesh Geometry"] --> B["GN Group: AIO Limbs"]
    C["logic.bend_crease_edge"] --> B1["Math input driver"]
    D["logic.hands"] --> B2["Math input driver"]

    B1 --> B
    B2 --> B

    B --> E["Named Attribute: crease_edge (read/write)"]
    E --> F["Set Shade Smooth / Join Geometry"]
    F --> G["Geo Output to Modifier Stack"]
```

## 8. 可见性与控制器 UI 自动切换

```mermaid
flowchart TD
    A["logic mode flags"] --> B["ArmatureData drivers on collections_all[*].is_visible"]

    B --> C1["IK/FK controller sets"]
    B --> C2["Left/Right hand variants (Alex/Steve)"]
    B --> C3["Footroll / Fancy / Ankle sets"]
    B --> C4["Face / Eye / Mouth / Tracker sets"]
    B --> C5["MI_Mapping set"]

    C1 --> D["Contextual animator UI"]
    C2 --> D
    C3 --> D
    C4 --> D
    C5 --> D
```

## 9. 驱动类型图（实现策略）

```mermaid
flowchart LR
    A["All Drivers (604)"] --> B1["AVERAGE (517)"]
    A --> B2["SCRIPTED (87)"]

    B1 --> C1["Single source mapping"]
    B1 --> C2["Cleaner maintenance for simple channels"]

    B2 --> D1["logic derived formulas"]
    B2 --> D2["bbone_easein/easeout shaping"]

    C1 --> E["Stable runtime behavior"]
    C2 --> E
    D1 --> E
    D2 --> E
```
