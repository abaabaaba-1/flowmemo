# FlowMemo Demo Runbook

## Local Mode

The local demo uses external DeepSeek V4 Pro for text generation:

```env
AI_PROVIDER=deepseek
NEXT_PUBLIC_FLOWMEMO_RUNTIME=local
DEEPSEEK_MODEL=deepseek-v4-pro
```

When deploying to Eazo, switch to:

```env
AI_PROVIDER=eazo
NEXT_PUBLIC_FLOWMEMO_RUNTIME=eazo
```

`NEXT_PUBLIC_FLOWMEMO_RUNTIME=local` keeps the Eazo auth/handoff overlay disabled
while running outside Eazo. The Eazo SDK path remains in the code and can be
re-enabled by switching this runtime flag back for deployment.

## Stable Image Assets

All demo images are local files under `public/demo`:

- `/demo/izu-bamboo-path.jpg`
- `/demo/izu-shuzenji-street.jpg`
- `/demo/izu-onsen-steam.jpg`
- `/demo/tokyo-sushi-counter.jpg`
- `/demo/tokyo-neon-night.jpg`
- `/demo/japan-shrine-lanterns.jpg`
- `/demo/pexels-bamboo-upward.jpg`
- `/demo/pexels-bamboo-path.jpg`
- `/demo/pexels-izu-rocky-coast.jpg`
- `/demo/pexels-japan-sea-waves.jpg`
- `/demo/pexels-shinjuku-rain.jpg`
- `/demo/pexels-shinjuku-umbrella.jpg`

The Pexels additions are used only as local demo/test materials for the photo-pool matcher.

## Demo Pipeline

1. Open `http://localhost:3002` for the production-style verification server, or `http://localhost:3001` for the existing dev server.
2. Fill or keep the required travel dates and destination on the onboarding page.
3. Optional: tap `智能导入行程` and select an itinerary screenshot. Local mode uses a deterministic fallback; Eazo mode calls the vision import route.
4. Tap `开始记录`; the line-art transition enters the main canvas.
5. Expected result: top-level `聊天 / 时间线` tabs render and the bottom input is voice-first.
6. In the chat tab, tap one of the note chips above the input:
   - `修善寺竹林`
   - `温泉旅馆`
   - `新宿夜色`
   - `筑地早餐`
   - `神社夜灯`
7. Expected result: the `智能锦囊` entrance fades in only after the first note/material.
8. Open `时间线`; expected result: the note appears as a warm timeline card with auto-matched photo collage and matched-photo labels.
9. Tap `生成今日手账`.
10. Expected result: scrapbook-style journal renders with collage cover, narrative, scene cards, and social share blocks.

## Copyable Text Prompts

```text
刚刚从修善寺竹林出来，雨停以后石板路都是湿的，溪水声特别近，整个人像被按了慢放键。
```

```text
傍晚回到温泉旅馆，木门一推开全是白雾和榻榻米的味道，突然觉得今天的疲惫都有了落点。
```

```text
最后一晚在新宿路口等红灯，霓虹照在积水里，比真实街景更像电影片尾。
```

```text
从东京出发抵达伊豆海岸，海风带着咸味，悬崖上的灯塔在落日里慢慢变成橘红色。
```

```text
我们在筑地排了好久，终于吃到金枪鱼大腹寿司，入口即化，连刚磨的山葵都特别清甜。
```

## What To Emphasize

- FlowMemo now has a real planning/chat surface and a separate timeline surface.
- The strongest demo moment is: voice/text note -> AI note draft -> photo-pool matcher -> timeline collage -> scrapbook journal.
- The `智能锦囊` is intentionally invisible at cold start and wakes only after useful material exists.
- The current SDK does not expose phone album scanning, so the implemented production-shaped path is a selectable photo pool. The matcher is isolated so a future native album capability can replace the source without changing note composition.

## Verified Checks

- `npm run build` passes.
- `npm run lint` exits with no errors. Current warnings are Next.js `<img>` optimization warnings plus one hook dependency warning in `DailyCanvasScreen`.
- API checks pass for itinerary import, travel chat, compose guardrails, and daily canvas generation.
- Browser pipeline passes on a 390 x 844 mobile viewport:
  onboarding -> trip launch -> chat -> note chip -> dynamic pocket -> timeline photo match -> scrapbook journal.
- Browser verification command:
  `node scripts/verify-flowmemo-pipeline.cjs`
- Screenshots are under `artifacts/pipeline-*.png`.
