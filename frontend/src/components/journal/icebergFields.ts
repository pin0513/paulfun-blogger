// 直接移植自設計稿 薩提爾冰山自我覺查日記.dc.html，選項與配色未改動。
export interface OptionGroup { label: string; options: string[] }
export interface BehaviorScope { key: string; label: string; options: string[] }
export interface IcebergField {
  key: string;
  label: string;
  en: string;
  hint: string;
  color: string;
  placeholder: string;
  scopes?: BehaviorScope[];
  groups?: OptionGroup[];
}

export const BEHAVIOR_SCOPES: BehaviorScope[] = [
  { key: 'work', label: '職場 · 溝通', options: ['會議中想說卻沒發言', '訊息已讀不回', '用比較硬的語氣回訊息', '一直說「好，沒問題」', '私下向同事抱怨', '主動幫別人收尾', '把事情攬下來自己做', '請假前反覆道歉'] },
  { key: 'pace', label: '職場 · 節奏', options: ['加班到很晚才走', '中午沒吃飯繼續做', '簡報改了又改不敢送出', '一直重整收件匣', '拖到最後一刻才開始', '排滿行程不留空檔'] },
  { key: 'front', label: '服務 · 現場', options: ['對客人保持笑容但心裡很累', '被指責時忍住不回嘴', '把情緒帶到下一位客人身上', '下班後完全不想說話', '事後一直重播那段對話'] },
  { key: 'care', label: '照顧 · 教學/醫護', options: ['多留半小時陪對方', '講第三次還是耐心說明', '回家後檢討自己不夠好', '把別人的狀況帶回家想', '忙到沒空喝水上廁所'] },
  { key: 'partner', label: '家庭 · 伴侶', options: ['冷戰不說話', '提高音量爭辯', '主動道歉求和', '把家事全部自己做完', '傳了訊息卻不等回覆', '講反話試探對方'] },
  { key: 'kid', label: '親子', options: ['對孩子大聲', '妥協買了他要的東西', '陪睡時一直滑手機', '反覆提醒功課', '事後跟孩子道歉', '幫他把事情做完'] },
  { key: 'self', label: '獨處 · 身體', options: ['睡前滑手機到很晚', '大吃一頓', '追劇到凌晨', '出門散步', '把自己關在房間', '寫下這篇日記', '取消原本的約'] },
];

export const FIELDS: IcebergField[] = [
  { key: 'behavior', label: '行為', en: 'BEHAVIOR', hint: '今天最日常的那個動作是什麼？先挑情境，再找最接近的一句。', color: '#5b8f8a', placeholder: '寫下或說出你的行為…', scopes: BEHAVIOR_SCOPES },
  { key: 'feeling', label: '感受', en: 'FEELINGS', hint: '在行為底下，那一刻的情緒是什麼？', color: '#6a86a8', placeholder: '寫下或說出你的感受…',
    groups: [
      { label: '不舒服的', options: ['生氣', '難過', '害怕', '焦慮', '委屈', '羞愧', '孤單', '無力', '失望', '煩躁', '緊繃'] },
      { label: '舒服的', options: ['平靜', '喜悅', '感動', '踏實', '期待', '被支持', '放鬆'] },
      { label: '混雜的', options: ['嫉妒', '不甘心', '既生氣又心疼', '鬆一口氣卻空虛'] },
    ] },
  { key: 'meta', label: '感受的感受', en: 'FEELINGS ABOUT FEELINGS', hint: '我怎麼看待自己的這份情緒？身體又有什麼反應？', color: '#7d7aa8', placeholder: '寫下心理或生理的反應…',
    groups: [
      { label: '心理的', options: ['不允許自己生氣', '覺得自己不該難過', '對焦慮感到焦慮', '為羞愧而自責', '怕被看見情緒', '接納這份感受'] },
      { label: '生理的', options: ['胸口悶緊', '胃部緊縮', '喉嚨卡住', '肩頸僵硬', '心跳加快', '手腳冰冷', '頭很重', '疲倦想睡', '呼吸變淺'] },
    ] },
  { key: 'view', label: '觀點', en: 'PERCEPTIONS', hint: '我對這件事的解讀、規則與信念是什麼？', color: '#9a7a9e', placeholder: '寫下你的想法或信念…',
    groups: [
      { label: '對自己的規則', options: ['我應該要做到完美', '我不能麻煩別人', '示弱等於失敗', '我要照顧好每個人', '我沒有選擇'] },
      { label: '對關係的假設', options: ['別人一定覺得我很糟', '表達需求會被討厭', '衝突代表關係要破裂', '事情本來就該公平', '不說對方也該懂'] },
    ] },
  { key: 'expectSelf', label: '期待 · 對自己', en: 'EXPECTATIONS OF SELF', hint: '我希望自己怎麼做、成為什麼樣子？', color: '#a87f83', placeholder: '希望自己…',
    groups: [{ label: '常見的', options: ['希望自己冷靜一點', '希望自己勇敢說出來', '希望自己不要在意', '希望自己被自己接納', '希望自己好好休息', '希望自己不要犯錯', '希望自己有選擇的自由'] }] },
  { key: 'expectOther', label: '期待 · 對他人', en: 'EXPECTATIONS OF OTHERS', hint: '我希望對方怎麼對待我？（常常沒說出口）', color: '#b08a72', placeholder: '希望他…',
    groups: [{ label: '常見的', options: ['希望他先聽我說完', '希望他主動關心我', '希望他承認錯誤', '希望他給我空間', '希望他改變做法', '希望他記得我的付出'] }] },
  { key: 'expectFrom', label: '期待 · 他人對我的', en: 'OTHERS EXPECTATIONS OF ME', hint: '我猜想別人期待我成為什麼樣子？那是真的嗎？', color: '#b09a6e', placeholder: '我猜他期待我…',
    groups: [{ label: '常見的', options: ['他期待我不要生氣', '他期待我配合', '他期待我表現優秀', '他期待我照顧他的情緒', '他期待我獨立不麻煩人', '他期待我永遠有耐心'] }] },
  { key: 'values', label: '價值觀 · 渴望', en: 'YEARNINGS · SELF', hint: '冰山最底層：我真正渴望的是什麼？這也是最值得帶走的答案。', color: '#1f6f6b', placeholder: '我渴望…',
    groups: [
      { label: '關係中的渴望', options: ['被愛', '被接納', '被尊重', '被看見', '與人連結', '被信任'] },
      { label: '自我的渴望', options: ['自由', '安全感', '有意義', '成長', '誠實', '平等', '我是有價值的', '我可以就是我自己'] },
    ] },
];
