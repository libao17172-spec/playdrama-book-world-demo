export const smokeTestStory = {
  id: 'smoke-test-story', contentType: 'story', graphMode: 'character',
  title: '《雾灯镇来信》', worldName: '雾灯镇', subtitle: '一封没有署名的信，把两位旧友带回钟楼',
  summary: '用于证明故事、人物和物品可以接入同一套3D引擎。', duration: '约 3 分钟',
  theme: { sky: '#78899a', fog: '#a9b0ae', ground: '#5d6658', ink: '#1d2630', paper: '#eee3c8', accent: '#ce8e52' },
  spawn: [0, 0.9, 12],
  zones: [
    { id: 'harbor', name: '旧港', center: [-8, -4], radius: 12, color: '#4f7182', accent: '#9fd5e7', landmark: '雾灯码头', narration: '潮声掩住了脚步。林遥在旧港等着一个迟到十年的答案。', audio: '' },
    { id: 'tower', name: '钟楼街', center: [9, -9], radius: 12, color: '#8a6048', accent: '#e9b686', landmark: '停摆钟楼', narration: '钟楼停在十一点四十分，那正是旧案发生的时间。', audio: '' },
  ],
  entities: [
    { id: 'lin-yao', type: 'character', title: '林遥', zoneId: 'harbor', position: [-9, 0, -4], propType: 'character', summary: '离开家乡十年的记者。', detail: '她收到一封没有署名的信，被迫重新面对当年的选择。', source: '原创演示故事', narration: '林遥相信真相会留下痕迹。', audio: '', discover: { radius: 4 }, interaction: { enabled: true, action: 'open-detail' } },
    { id: 'zhou-ming', type: 'character', title: '周明', zoneId: 'tower', position: [10, 0, -9], propType: 'character', summary: '守着钟楼秘密的修表匠。', detail: '周明知道钟楼为什么停摆，也知道那封信应该交给谁。', source: '原创演示故事', narration: '周明十年来一直在修一只没有指针的表。', audio: '', discover: { radius: 4 }, interaction: { enabled: true, action: 'open-detail' } },
    { id: 'unsigned-letter', type: 'item', title: '无名信', zoneId: 'tower', position: [4, 0, -8], propType: 'letter', summary: '信封上只有一枚雾灯印章。', detail: '信中只有一句话：钟响之前，到旧港来。', source: '原创演示故事', narration: '纸张带着海水和机油的气味。', audio: '', discover: { radius: 3.5 }, interaction: { enabled: true, action: 'open-detail' } },
  ],
  relations: [
    { from: 'lin-yao', to: 'zhou-ming', type: 'knows' },
    { from: 'zhou-ming', to: 'unsigned-letter', type: 'owns' },
    { from: 'unsigned-letter', to: 'lin-yao', type: 'influences' },
  ],
  world: { style: 'fog-town', bounds: 30, obstacles: [{ position: [0, 2, 1], size: [10, 4, 3], kind: 'archive' }] },
};
