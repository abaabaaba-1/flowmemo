interface CapsuleDraft {
  title?: string;
  location?: string;
  keywords?: string[];
  content?: string;
}

interface DemoScene {
  anchors: string[];
  fallback: Required<CapsuleDraft>;
}

const DEMO_SCENES: DemoScene[] = [
  {
    anchors: ["修善寺", "竹林", "石板", "溪水", "雨后", "治愈"],
    fallback: {
      title: "雨后竹林慢镜头",
      location: "修善寺竹林",
      keywords: ["修善寺", "竹林", "雨后", "溪水", "慢放"],
      content:
        "雨停后的修善寺竹林像被按下慢放键。湿润的石板路映着天光，溪水声贴着脚边流过，竹叶偶尔落下一滴水，把整个下午洗得很轻。",
    },
  },
  {
    anchors: ["温泉", "旅馆", "白雾", "榻榻米", "木门"],
    fallback: {
      title: "白雾里的归处",
      location: "伊豆温泉旅馆",
      keywords: ["温泉", "白雾", "榻榻米", "疲惫", "归处"],
      content:
        "傍晚推开温泉旅馆的木门，白雾和榻榻米的气味一起涌出来。一天的疲惫忽然有了落点，像行李终于放下，也像心里那口气终于慢慢松开。",
    },
  },
  {
    anchors: ["新宿", "霓虹", "积水", "红灯", "电影"],
    fallback: {
      title: "新宿片尾倒影",
      location: "东京新宿",
      keywords: ["新宿", "霓虹", "积水", "夜晚", "电影感"],
      content:
        "新宿路口的红灯亮起时，霓虹全落进积水里。真实街景在头顶喧哗，倒影却像电影片尾一样安静，把旅行最后一晚剪成一帧发亮的画面。",
    },
  },
  {
    anchors: ["伊豆", "海岸", "海风", "悬崖", "灯塔", "落日"],
    fallback: {
      title: "伊豆海风落日",
      location: "伊豆海岸",
      keywords: ["伊豆", "海岸", "海风", "灯塔", "落日"],
      content:
        "从东京抵达伊豆海岸时，风里带着清晰的咸味。悬崖边的灯塔被落日慢慢染成橘红色，海面一层一层发亮，像旅程真正开始前的一次深呼吸。",
    },
  },
  {
    anchors: ["筑地", "寿司", "金枪鱼", "大腹", "山葵", "早餐"],
    fallback: {
      title: "筑地大腹一口",
      location: "筑地市场",
      keywords: ["筑地", "寿司", "金枪鱼", "大腹", "早餐"],
      content:
        "筑地的早晨热闹得很诚实。排队等到那块金枪鱼大腹时，油脂在舌尖轻轻化开，刚磨的山葵带着清甜，把这一口变成今天最明确的记忆点。",
    },
  },
  {
    anchors: ["神社", "灯笼", "红色", "安静", "东京", "夜灯"],
    fallback: {
      title: "神社夜灯",
      location: "东京神社",
      keywords: ["神社", "灯笼", "红色", "夜晚", "安静"],
      content:
        "晚上路过那排神社灯笼时，红色的光很轻。东京的声音像被悄悄调低，只剩灯影和脚步，把喧闹的一天收进安静里。",
    },
  },
];

function normalizeText(value: unknown) {
  if (Array.isArray(value)) return value.join(" ");
  return String(value ?? "");
}

function countMatches(text: string, anchors: string[]) {
  return anchors.reduce((count, anchor) => (text.includes(anchor) ? count + 1 : count), 0);
}

export function sanitizeDemoCapsuleDraft(userText: string, draft: CapsuleDraft): CapsuleDraft {
  const inputScene = DEMO_SCENES.find((scene) => countMatches(userText, scene.anchors) >= 2);
  if (!inputScene) return draft;

  const generatedText = [
    draft.title,
    draft.location,
    normalizeText(draft.keywords),
    draft.content,
  ].join(" ");

  if (countMatches(generatedText, inputScene.anchors) >= 2) {
    return {
      ...draft,
      title: draft.title || inputScene.fallback.title,
      location: draft.location || inputScene.fallback.location,
      keywords: draft.keywords?.length ? draft.keywords : inputScene.fallback.keywords,
      content: draft.content || inputScene.fallback.content,
    };
  }

  return inputScene.fallback;
}
