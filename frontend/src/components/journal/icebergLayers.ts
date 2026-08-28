import type { CopingStance } from "@/types";

/** 薩提爾冰山八層。order 由水面往下遞增，depth 用來畫縮排／深度感。 */
export const ICEBERG_LAYERS = [
  {
    key: "behavior",
    label: "行為 / 事件",
    hint: "只寫事實，一個形容詞都不要有。「他做了什麼、我做了什麼」，不是「他很故意」。",
    above: true,
  },
  {
    key: "coping",
    label: "應對姿態",
    hint: "當下我用哪一種方式在面對？",
    above: true,
    select: true,
  },
  {
    key: "feeling",
    label: "感受",
    hint: "生氣、難過、害怕、委屈…先命名它。",
    above: false,
  },
  {
    key: "feelingAbout",
    label: "感受的感受",
    hint: "對這個感受，我又有什麼感受？生氣底下常常是羞愧。這一層是整套裡最容易跳過、也最關鍵的。",
    above: false,
  },
  {
    key: "viewpoint",
    label: "觀點 / 信念",
    hint: "我心裡認定「事情本來應該怎樣」？那個假設是哪來的？",
    above: false,
  },
  {
    key: "expectation",
    label: "期待",
    hint: "我對自己、對他人的期待；還有我以為別人對我的期待。",
    above: false,
  },
  {
    key: "yearning",
    label: "渴望",
    hint: "被愛、被接納、被看見、自由、有意義——人共通的那幾個。",
    above: false,
  },
  {
    key: "self",
    label: "自我 / 生命力",
    hint: "拿掉上面全部之後，我是誰？",
    above: false,
  },
] as const;

export const COPING_OPTIONS: { value: CopingStance; label: string; desc: string }[] = [
  { value: "placating", label: "討好", desc: "忽略自己，只顧他人與情境" },
  { value: "blaming", label: "指責", desc: "忽略他人，只顧自己與情境" },
  { value: "superReasonable", label: "超理智", desc: "忽略雙方感受，只講道理" },
  { value: "irrelevant", label: "打岔", desc: "三者都忽略，轉移離開" },
  { value: "congruent", label: "一致", desc: "自己、他人、情境三者都在" },
];

export const copingLabel = (v?: string | null) =>
  COPING_OPTIONS.find((o) => o.value === v)?.label ?? "";
