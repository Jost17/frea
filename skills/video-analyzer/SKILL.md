---
name: video-analyzer
description: |
  Comprehensive video analysis combining audio transcription (Whisper), visual frame extraction (ffmpeg), deep content analysis using Fabric's extract_wisdom pattern, and visual analysis (Claude Vision).
 Fuer lokale Video-Dateien: Financial Charts, Presentations, Tutorials, Podcasts.
triggers:
  - "analyze.*video"
  - "local video"
  - "transcribe video"
  - "whisper"
  - "video file"
  - ".mp4"
  - ".mov"
---

# Video Analyzer

Comprehensive video analysis fuer lokale Video-Dateien.

## Pre-Flight Checklist

- **Output:** `$OBSIDIAN_VAULT/001 Pipeline/Processing/Video Notes WIP/`
- **Filename:** `VID_YYYY-MM-DD_Author_Title_With_Underscores.md`
- **Check:** Duplicates in Video Notes WIP/

## Core Capabilities

1. **Transcription** — Whisper (tiny/base/small/medium/large-v3), multiple formats (txt/srt/vtt/json)
2. **Frame Extraction** — Smart/interval/scene/timestamp modes
3. **Extract Wisdom** — Fabric pattern: IDEAS, INSIGHTS, QUOTES, HABITS, FACTS, RECOMMENDATIONS
4. **Visual Analysis** — Claude Vision for charts, diagrams, presentations
5. **Complete Analysis** — Orchestrated workflow

## Workflow

```
Video Analysis Request
├─ Transcription only? → transcribe.py
├─ Deep insights? → transcribe.py + Fabric extract_wisdom
├─ Frames only? → extract_frames.py
└─ Complete analysis? → analyze_video.py + Fabric pattern
```

## Trigger

- "analyze video"
- "transcribe video"
- "whisper"
- ".mp4"

## Paul II Relevanz

**Relevanz: Niedrig** — Nur fuer Josts Video-Analyse. Nicht meine Kernaufgaben.
