const zone = (id, name, center, color, accent, narration, landmark) => ({
  id, name, center, radius: 14, color, accent, narration, landmark,
  audio: '',
});

const sourceById = {
  'specific-knowledge': '第一部分·第一章「找到天赋所在，积累专长」，PDF第39页起',
  accountability: '第一部分·第一章「承担责任」，PDF第48页起',
  leverage: '第一部分·第一章「找到杠杆」，PDF第53页起',
  'compound-interest': '第一部分·第一章「投资交友，着眼长远」及财富创造原理，PDF第31—47页',
  'clear-thinking': '第一部分·第二章「如何清晰地思考」，PDF第91页起',
  reading: '第一部分·第二章「学会热爱阅读」，PDF第110页起',
  decision: '第一部分·第二章「学习决策技巧」，PDF第99页起',
  'long-term': '第一部分·第一章「投资交友，着眼长远」，PDF第45页起',
  desire: '第二部分·第三章「欲望是主动选择的不开心」，PDF第133页起',
  peace: '第二部分·第三章「幸福需要心境平和」，PDF第131页起',
  health: '第二部分·第四章「选择关爱自己」，PDF第157页起',
  freedom: '第二部分·第四章「选择解放自己」，PDF第185页起',
};

const knowledge = (id, title, zoneId, position, propType, summary, detail, interactive = false) => ({
  id, type: 'knowledge', title, zoneId, position, propType, summary, detail,
  source: sourceById[id],
  narration: detail || summary,
  audio: '',
  discover: { radius: 4.2 },
  interaction: { enabled: interactive, action: 'open-detail' },
});

export const navalAlmanack = {
  id: 'naval-almanack',
  contentType: 'knowledge',
  graphMode: 'knowledge',
  title: '《纳瓦尔宝典》',
  worldName: '自由与判断之境',
  subtitle: '走进财富、判断与幸福的思想地图',
  summary: '在一座会回应你的思想花园里，用行走理解专长、杠杆、复利与自由。',
  duration: '约 8 分钟',
  theme: { sky: '#9cc9d6', fog: '#d5e1d2', ground: '#7b9b72', ink: '#18312d', paper: '#f3ead6', accent: '#d8a33f' },
  spawn: [0, 0.9, 15],
  zones: [
    zone('wealth', '财富工坊', [13, -5], '#c98238', '#ffd47a', '财富来自拥有能够持续创造价值的能力。找到专长，承担责任，再用杠杆与时间放大成果。', '齿轮塔'),
    zone('judgment', '判断书院', [-13, -5], '#426b8a', '#a6d8ff', '清晰的判断需要阅读、独立思考和长期训练。聪明若缺少判断，也很难抵达正确方向。', '观星书塔'),
    zone('happiness', '幸福庭院', [0, -23], '#5c8b66', '#bce3a4', '幸福更接近平静的默认状态。减少不必要的欲望，照顾身体，才能拥有真正可支配的时间。', '静心水庭'),
  ],
  entities: [
    knowledge('specific-knowledge', '专长', 'wealth', [8, 0, -1], 'workbench', '专长是你做起来像玩、别人看起来像工作的能力。', '专长常来自长期兴趣、天赋和真实经验的交汇。先观察自己愿意持续投入什么，再让市场看见你独特的价值。', true),
    knowledge('accountability', '责任', 'wealth', [14, 0, 2], 'nameplate', '用自己的名字承担结果，才可能获得更大的回报。', '责任会带来风险，也带来信誉和成果的所有权。清楚表达自己负责什么，让长期合作建立在可验证的结果上。', false),
    knowledge('leverage', '杠杆', 'wealth', [18, 0, -6], 'lever', '杠杆放大个人判断力和劳动成果。', '代码和媒体可以低成本复制，资本与人力可以扩大行动规模。先建立判断和专长，再选择不会让自己失控的杠杆。', true),
    knowledge('compound-interest', '复利', 'wealth', [12, 0, -12], 'hourglass', '时间会放大持续做对的小事。', '财富、关系、知识和信誉都具有复利特征。关键在于方向正确、持续足够久，并避免一次错误摧毁长期积累。', true),
    knowledge('clear-thinking', '清晰思考', 'judgment', [-8, 0, -1], 'lens', '看清现实，比维护自己的观点更重要。', '降低自我欺骗，分开事实、判断和情绪。愿意承认不知道，才能给新证据留下位置。', false),
    knowledge('reading', '阅读', 'judgment', [-14, 0, 1], 'bookshelf', '阅读是在借用优秀头脑训练自己的判断。', '选择值得反复阅读的基础作品，理解核心原理，再把知识连接到真实问题。阅读数量不如理解深度重要。', true),
    knowledge('decision', '决策', 'judgment', [-19, 0, -6], 'scale', '重要决策要留给清醒、长期的判断。', '先判断选择是否可逆，再决定投入多少分析。对不可逆的大事放慢，对可逆的小事快速试验，用结果校正判断。', true),
    knowledge('long-term', '长期合作', 'judgment', [-12, 0, -12], 'bridge', '与值得信任的人重复合作，会持续降低摩擦。', '选择聪明、有行动力、讲诚信的人长期合作。重复博弈会奖励诚实、可靠与共同成长。', false),
    knowledge('desire', '欲望', 'happiness', [-7, 0, -20], 'well', '每一个欲望都在约定：实现之前，我不会快乐。', '欲望能推动行动，也会占用注意力。识别最重要的少数目标，放下由比较产生的欲望，给平静留下空间。', true),
    knowledge('peace', '平静', 'happiness', [0, 0, -27], 'bench', '平静来自停止与现实争辩。', '把注意力带回当下，减少脑内无休止的评价。平静并非什么都不做，它让行动更少被恐惧和攀比驱动。', true),
    knowledge('health', '健康', 'happiness', [7, 0, -20], 'pavilion', '身体是承载自由、判断和幸福的基础。', '稳定睡眠、自然饮食和持续运动的回报会长期累积。健康不该排在成功之后，它决定你能否享受成功。', false),
    knowledge('freedom', '自由', 'happiness', [0, 0, -16], 'gate', '真正的财富，是可以自主安排自己的时间。', '金钱的价值在于买回时间和选择权。减少不必要的身份负担，建立可持续的收入与生活方式，才能逐步获得自由。', true),
  ],
  relations: [
    ['specific-knowledge', 'accountability', 'supports'], ['specific-knowledge', 'leverage', 'supports'],
    ['accountability', 'long-term', 'supports'], ['leverage', 'compound-interest', 'influences'],
    ['compound-interest', 'long-term', 'extends'], ['reading', 'clear-thinking', 'supports'],
    ['clear-thinking', 'decision', 'supports'], ['long-term', 'decision', 'influences'],
    ['desire', 'peace', 'contrasts'], ['health', 'peace', 'supports'],
    ['health', 'freedom', 'supports'], ['freedom', 'peace', 'supports'],
    ['compound-interest', 'freedom', 'influences'], ['decision', 'leverage', 'supports'],
  ].map(([from, to, type]) => ({ from, to, type })),
  world: {
    style: 'scholar-garden', bounds: 37,
    obstacles: [
      { position: [0, 1.8, 2], size: [8, 3.6, 4], kind: 'archive' },
      { position: [24, 2, -5], size: [3, 4, 24], kind: 'wall' },
      { position: [-24, 2, -5], size: [3, 4, 24], kind: 'wall' },
      { position: [0, 2, -35], size: [30, 4, 2], kind: 'wall' },
    ],
  },
};
