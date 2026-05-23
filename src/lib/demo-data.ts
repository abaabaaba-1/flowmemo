// Demo travel data for local/showcase mode. Images are bundled in public/demo so
// the live demo does not depend on third-party image hosts.
export const DEMO_PHOTOS = {
  bamboo1: "/demo/izu-bamboo-path.jpg",
  bamboo2: "/demo/izu-shuzenji-street.jpg",
  onsen: "/demo/izu-onsen-steam.jpg",
  street: "/demo/izu-shuzenji-street.jpg",
  shrine: "/demo/japan-shrine-lanterns.jpg",
  sushi: "/demo/tokyo-sushi-counter.jpg",
  tokyo_night: "/demo/tokyo-neon-night.jpg",
  bamboo_upward: "/demo/pexels-bamboo-upward.jpg",
  bamboo_path_alt: "/demo/pexels-bamboo-path.jpg",
  izu_coast: "/demo/pexels-izu-rocky-coast.jpg",
  japan_waves: "/demo/pexels-japan-sea-waves.jpg",
  shinjuku_rain: "/demo/pexels-shinjuku-rain.jpg",
  shinjuku_umbrella: "/demo/pexels-shinjuku-umbrella.jpg",
};

export const DEMO_JOURNEY = {
  id: "demo-journey-izu",
  destination: "日本 · 伊豆 · 东京",
  description: "伊豆海岸 · 修善寺温泉街 · 筑地 · 新宿",
  startDate: new Date("2026-11-08T00:00:00"),
  endDate: new Date("2026-11-14T00:00:00"),
};

export const DEMO_PHOTO_POOL = [
  {
    id: "demo-photo-bamboo",
    url: DEMO_PHOTOS.bamboo1,
    label: "修善寺竹林雨后",
    location: "修善寺竹林",
    tags: ["修善寺", "竹林", "竹林小径", "溪水", "雨后", "治愈", "绿色", "bamboo", "path"],
    capturedAt: "2026-11-09T10:18:00+09:00",
    source: "demo" as const,
  },
  {
    id: "demo-photo-bamboo-upward",
    url: DEMO_PHOTOS.bamboo_upward,
    label: "竹林仰拍光影",
    location: "修善寺竹林",
    tags: ["修善寺", "竹林", "仰拍", "光影", "清爽", "bamboo", "green"],
    capturedAt: "2026-11-09T10:24:00+09:00",
    source: "demo" as const,
    isRetouched: true,
  },
  {
    id: "demo-photo-bamboo-path-alt",
    url: DEMO_PHOTOS.bamboo_path_alt,
    label: "竹林小径",
    location: "修善寺竹林",
    tags: ["修善寺", "竹林", "小径", "散步", "安静", "bamboo", "path"],
    capturedAt: "2026-11-09T10:35:00+09:00",
    source: "demo" as const,
  },
  {
    id: "demo-photo-izu-coast",
    url: DEMO_PHOTOS.izu_coast,
    label: "伊豆海岸峭壁",
    location: "伊豆海岸",
    tags: ["伊豆", "海岸", "海边", "岩石", "峭壁", "海风", "灯塔", "蓝色", "coast", "sea"],
    capturedAt: "2026-11-08T16:18:00+09:00",
    source: "demo" as const,
  },
  {
    id: "demo-photo-japan-waves",
    url: DEMO_PHOTOS.japan_waves,
    label: "海面波光",
    location: "伊豆海岸",
    tags: ["伊豆", "海", "海面", "海浪", "波光", "船", "夏天", "waves", "sea"],
    capturedAt: "2026-11-08T16:42:00+09:00",
    source: "demo" as const,
  },
  {
    id: "demo-photo-street",
    url: DEMO_PHOTOS.bamboo2,
    label: "温泉街石板路",
    location: "修善寺温泉街",
    tags: ["修善寺", "温泉街", "石板路", "散步", "复古", "street", "onsen"],
    capturedAt: "2026-11-09T11:02:00+09:00",
    source: "demo" as const,
  },
  {
    id: "demo-photo-onsen",
    url: DEMO_PHOTOS.onsen,
    label: "旅馆白雾",
    location: "伊豆温泉旅馆",
    tags: ["温泉", "旅馆", "白雾", "榻榻米", "疲惫", "落点", "onsen", "steam"],
    capturedAt: "2026-11-09T17:46:00+09:00",
    source: "demo" as const,
    isRetouched: true,
  },
  {
    id: "demo-photo-sushi",
    url: DEMO_PHOTOS.sushi,
    label: "筑地金枪鱼大腹",
    location: "筑地市场",
    tags: ["筑地", "寿司", "金枪鱼", "大腹", "早餐", "美食", "sushi", "food", "tuna"],
    capturedAt: "2026-11-11T08:20:00+09:00",
    source: "demo" as const,
  },
  {
    id: "demo-photo-tokyo-night",
    url: DEMO_PHOTOS.tokyo_night,
    label: "新宿霓虹夜",
    location: "东京新宿",
    tags: ["东京", "新宿", "霓虹", "夜晚", "倒影", "电影", "neon", "night", "tokyo"],
    capturedAt: "2026-11-12T20:31:00+09:00",
    source: "demo" as const,
  },
  {
    id: "demo-photo-shrine",
    url: DEMO_PHOTOS.shrine,
    label: "神社灯笼",
    location: "东京神社",
    tags: ["神社", "灯笼", "红色", "安静", "夜色", "shrine", "lantern"],
    capturedAt: "2026-11-12T18:10:00+09:00",
    source: "demo" as const,
  },
  {
    id: "demo-photo-shinjuku-rain",
    url: DEMO_PHOTOS.shinjuku_rain,
    label: "新宿雨夜霓虹",
    location: "东京新宿",
    tags: ["东京", "新宿", "雨夜", "霓虹", "街道", "电影", "rain", "neon", "night"],
    capturedAt: "2026-11-12T20:40:00+09:00",
    source: "demo" as const,
    isRetouched: true,
  },
  {
    id: "demo-photo-shinjuku-umbrella",
    url: DEMO_PHOTOS.shinjuku_umbrella,
    label: "新宿伞下人流",
    location: "东京新宿",
    tags: ["东京", "新宿", "雨", "伞", "夜晚", "人流", "umbrella", "rain"],
    capturedAt: "2026-11-12T20:46:00+09:00",
    source: "demo" as const,
  },
];

export const DEMO_CAPSULES = [
  {
    id: "demo-capsule-1",
    journeyId: "demo-journey-izu",
    title: "修善寺的安静午后",
    location: "修善寺温泉街",
    userRawText: "终于到修善寺温泉了，竹林小径人很少，只能听到溪水声，特别治愈。",
    aiContent:
      "竹影和溪水把下午的节奏放慢，修善寺像旅途中突然出现的一小段空白。青苔覆盖的石子路上，温泉的白雾漫过古木，时间在这里以另一种刻度流动。",
    aiContentStyle: "cinematic",
    keywords: ["竹林", "溪水", "治愈", "温泉", "古道"],
    photoUrls: [DEMO_PHOTOS.bamboo1, DEMO_PHOTOS.bamboo_upward, DEMO_PHOTOS.bamboo_path_alt],
    photoCount: 3,
    capturedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "demo-capsule-2",
    journeyId: "demo-journey-izu",
    title: "筑地市场的黄金大腹",
    location: "东京筑地市场",
    userRawText: "终于吃到了念念不忘的金枪鱼大腹，入口即化，配上刚磨的山葵，太绝了。",
    aiContent:
      "清晨的筑地，刀光与鱼腥混在一起。那块大腹切得很薄，粉色里透着油脂的光，放进嘴里的瞬间，整个东京的嘈杂都安静了。",
    aiContentStyle: "cinematic",
    keywords: ["金枪鱼", "筑地", "美食", "清晨", "仪式感"],
    photoUrls: [DEMO_PHOTOS.sushi],
    photoCount: 1,
    capturedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: "demo-capsule-3",
    journeyId: "demo-journey-izu",
    title: "新宿的霓虹与倒影",
    location: "东京新宿",
    userRawText: "晚上的新宿太迷幻了，霓虹灯把整条街都染成了橙色和蓝色。",
    aiContent:
      "新宿的夜不是黑色的，是橙和蓝交叉的暖色调滤镜。积水里的霓虹倒影比真实的更像电影，旅行最后一晚，适合把自己交给这座城市的明亮。",
    aiContentStyle: "cinematic",
    keywords: ["霓虹", "夜晚", "新宿", "电影感", "倒影"],
    photoUrls: [DEMO_PHOTOS.tokyo_night, DEMO_PHOTOS.shinjuku_rain],
    photoCount: 2,
    capturedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
];

export const DEMO_PIPELINE_INPUTS = [
  {
    label: "修善寺竹林",
    text: "刚刚从修善寺竹林出来，雨停以后石板路都是湿的，溪水声特别近，整个人像被按了慢放键。",
    image: DEMO_PHOTOS.bamboo1,
  },
  {
    label: "温泉旅馆",
    text: "傍晚回到温泉旅馆，木门一推开全是白雾和榻榻米的味道，突然觉得今天的疲惫都有了落点。",
    image: DEMO_PHOTOS.onsen,
  },
  {
    label: "新宿夜色",
    text: "最后一晚在新宿路口等红灯，霓虹照在积水里，比真实街景更像电影片尾。",
    image: DEMO_PHOTOS.tokyo_night,
  },
  {
    label: "筑地早餐",
    text: "我们在筑地排了好久，终于吃到金枪鱼大腹寿司，入口即化，连刚磨的山葵都特别清甜。",
    image: DEMO_PHOTOS.sushi,
  },
  {
    label: "神社夜灯",
    text: "晚上路过一排神社灯笼，红色的光很安静，感觉东京突然从喧闹里退了一步。",
    image: DEMO_PHOTOS.shrine,
  },
  {
    label: "伊豆海风",
    text: "从东京出发抵达伊豆海岸，海风带着咸味，悬崖上的灯塔在落日里慢慢变成橘红色。",
    image: DEMO_PHOTOS.izu_coast,
  },
  {
    label: "新宿雨夜",
    text: "新宿下雨以后，霓虹和车灯都落在地面上，撑伞穿过人群的时候，像走进一段电影片尾。",
    image: DEMO_PHOTOS.shinjuku_rain,
  },
];

export const DEMO_CHAT_PROMPTS = [
  "修善寺 11 月初适合穿什么衣服？",
  "推荐筑地附近的早餐路线",
  "帮我把今天的笔记整理成手账",
];

export const DEMO_ITINERARY_IMPORT = {
  destination: "日本 · 伊豆 · 东京",
  startDate: "2026-11-08",
  endDate: "2026-11-14",
  title: "伊豆 · 修善寺 · 东京",
};

export const DEMO_JOURNAL_TEXT: Record<string, string> = {
  cinematic: `画面在修善寺的白雾里缓缓展开。竹林是滤镜，溪水是配乐，温泉的蒸汽让空气里有了一种比现实更浓的质地。

午后的筑地像一部快进的纪录片，刀、光、鱼腥、喧哗，然后那一口大腹在清晨的光线里慢动作地落入口中。美食有时候是旅途中最诚实的情节。

东京把自己用霓虹写进了最后一帧。新宿积水里的倒影比本尊更像一部老电影的片头，这座城市擅长让离开的人带走一个无法复现的版本。`,

  healing: `今天真正停下来的，是修善寺那条没有游客的小径。溪水很响，心却慢慢安静了。

筑地的早晨教会我什么叫当下。好的食物不需要太多背景故事，只需要你在那个时刻、那个地点，好好吃一口。

夜晚的新宿其实很温柔。霓虹不是喧嚣，是这座城市在说晚安。`,

  xiaohongshu: `修善寺竹林真的很治愈。人少、安静、听得到溪水声，和网上攻略里那些拥挤景点完全不同，是今天最想私藏的一站。

筑地市场的金枪鱼大腹值得早起。排队有点久，但入口即化，配新鲜山葵，确实是会反复想起的一口。

新宿雨后的霓虹倒影太出片了。建议雨后去，积水反光会把普通街景变成电影感片尾。`,

  poetic: `竹子知道怎么接住溪水的叹息。修善寺的午后，白雾是当地人写给外来者的信。

大腹像一场简短的告别。入口、融化、消失，只剩下此刻还在。

霓虹不是光，是东京写给黑夜的注脚。新宿的积水里，我们都活成了别人的倒影。`,

  funny: `修善寺：拍了两百张竹林照片，修图花了三小时，朋友圈五个赞，其中三个可能是亲友团。

筑地：排队一小时，吃完十五秒，但我会把这一口讲给未来十年认识的每一个人听。

新宿夜晚：本来是出来玩的，结果蹲在积水旁边拍倒影四十分钟。但图是真的好看。`,
};
