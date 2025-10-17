/**
 * 知名学者数据库
 * AI/ML 领域的顶级学者
 */

export interface TopAuthorInfo {
  name: string;
  field: string[];  // 研究领域
  affiliation: string;
  hIndex?: number;  // 估计的 h-index
  notableWorks?: string[];  // 代表作
  aliases?: string[];  // 别名
}

/**
 * 深度学习领域顶级学者
 */
export const DEEP_LEARNING_PIONEERS: TopAuthorInfo[] = [
  {
    name: 'Geoffrey Hinton',
    field: ['Deep Learning', 'Neural Networks'],
    affiliation: 'Google DeepMind',
    hIndex: 180,
    notableWorks: ['Backpropagation', 'Capsule Networks', 'Dropout'],
    aliases: ['Geoff Hinton']
  },
  {
    name: 'Yann LeCun',
    field: ['Deep Learning', 'Computer Vision'],
    affiliation: 'Meta AI',
    hIndex: 170,
    notableWorks: ['CNN', 'LeNet'],
    aliases: []
  },
  {
    name: 'Yoshua Bengio',
    field: ['Deep Learning', 'NLP'],
    affiliation: 'Mila',
    hIndex: 160,
    notableWorks: ['Attention Mechanism', 'GAN'],
    aliases: []
  },
  {
    name: 'Andrew Ng',
    field: ['Machine Learning', 'Deep Learning'],
    affiliation: 'Stanford University',
    hIndex: 150,
    notableWorks: ['Coursera ML', 'Google Brain'],
    aliases: []
  },
  {
    name: 'Ian Goodfellow',
    field: ['Deep Learning', 'Adversarial ML'],
    affiliation: 'Google DeepMind',
    hIndex: 120,
    notableWorks: ['GAN'],
    aliases: []
  },
];

/**
 * NLP 领域顶级学者
 */
export const NLP_PIONEERS: TopAuthorInfo[] = [
  {
    name: 'Ashish Vaswani',
    field: ['NLP', 'Transformers'],
    affiliation: 'Google Brain',
    hIndex: 80,
    notableWorks: ['Attention Is All You Need'],
    aliases: []
  },
  {
    name: 'Jacob Devlin',
    field: ['NLP'],
    affiliation: 'Google',
    hIndex: 90,
    notableWorks: ['BERT'],
    aliases: []
  },
  {
    name: 'Ilya Sutskever',
    field: ['Deep Learning', 'NLP'],
    affiliation: 'OpenAI',
    hIndex: 130,
    notableWorks: ['GPT', 'Sequence to Sequence'],
    aliases: []
  },
  {
    name: 'Christopher Manning',
    field: ['NLP'],
    affiliation: 'Stanford University',
    hIndex: 140,
    notableWorks: ['Stanford NLP'],
    aliases: ['Chris Manning']
  },
];

/**
 * 计算机视觉领域顶级学者
 */
export const CV_PIONEERS: TopAuthorInfo[] = [
  {
    name: 'Kaiming He',
    field: ['Computer Vision', 'Deep Learning'],
    affiliation: 'Meta AI',
    hIndex: 110,
    notableWorks: ['ResNet', 'Mask R-CNN'],
    aliases: []
  },
  {
    name: 'Ross Girshick',
    field: ['Computer Vision'],
    affiliation: 'Meta AI',
    hIndex: 100,
    notableWorks: ['R-CNN', 'Fast R-CNN'],
    aliases: []
  },
  {
    name: 'Jitendra Malik',
    field: ['Computer Vision'],
    affiliation: 'UC Berkeley',
    hIndex: 150,
    notableWorks: ['Image Segmentation'],
    aliases: []
  },
  {
    name: 'Fei-Fei Li',
    field: ['Computer Vision', 'AI'],
    affiliation: 'Stanford University',
    hIndex: 130,
    notableWorks: ['ImageNet'],
    aliases: []
  },
];

/**
 * 强化学习领域顶级学者
 */
export const RL_PIONEERS: TopAuthorInfo[] = [
  {
    name: 'Richard Sutton',
    field: ['Reinforcement Learning'],
    affiliation: 'University of Alberta',
    hIndex: 120,
    notableWorks: ['RL: An Introduction'],
    aliases: ['Rich Sutton']
  },
  {
    name: 'David Silver',
    field: ['Reinforcement Learning'],
    affiliation: 'Google DeepMind',
    hIndex: 100,
    notableWorks: ['AlphaGo', 'AlphaZero'],
    aliases: []
  },
  {
    name: 'Sergey Levine',
    field: ['Reinforcement Learning', 'Robotics'],
    affiliation: 'UC Berkeley',
    hIndex: 95,
    notableWorks: ['Deep RL for Robotics'],
    aliases: []
  },
];

/**
 * 中国顶级学者
 */
export const CHINESE_PIONEERS: TopAuthorInfo[] = [
  {
    name: 'Jian Sun',
    field: ['Computer Vision', 'Deep Learning'],
    affiliation: 'Megvii',
    hIndex: 110,
    notableWorks: ['ResNet'],
    aliases: ['孙剑']
  },
  {
    name: 'Xiaogang Wang',
    field: ['Computer Vision'],
    affiliation: 'Chinese University of Hong Kong',
    hIndex: 100,
    notableWorks: [],
    aliases: ['王晓刚']
  },
  {
    name: 'Hang Li',
    field: ['NLP', 'Machine Learning'],
    affiliation: 'ByteDance',
    hIndex: 90,
    notableWorks: [],
    aliases: ['李航']
  },
];

/**
 * 所有顶级学者
 */
export const ALL_TOP_AUTHORS = [
  ...DEEP_LEARNING_PIONEERS,
  ...NLP_PIONEERS,
  ...CV_PIONEERS,
  ...RL_PIONEERS,
  ...CHINESE_PIONEERS
];

/**
 * 根据作者名称查找学者信息
 */
export function findTopAuthor(name: string): TopAuthorInfo | null {
  const normalizedName = name.toLowerCase().trim();
  
  for (const author of ALL_TOP_AUTHORS) {
    // 检查主名称
    if (author.name.toLowerCase() === normalizedName) {
      return author;
    }
    
    // 检查别名
    if (author.aliases) {
      for (const alias of author.aliases) {
        if (alias.toLowerCase() === normalizedName) {
          return author;
        }
      }
    }
    
    // 姓氏匹配（简化版）
    const lastName = author.name.split(' ').pop()?.toLowerCase();
    if (lastName && normalizedName.includes(lastName)) {
      return author;
    }
  }
  
  return null;
}

/**
 * 判断是否为顶级学者
 */
export function isTopAuthor(name: string): boolean {
  return findTopAuthor(name) !== null;
}

/**
 * 获取作者的估计 h-index
 */
export function getAuthorHIndex(name: string): number | undefined {
  const author = findTopAuthor(name);
  return author?.hIndex;
}

/**
 * 根据领域获取顶级学者
 */
export function getTopAuthorsByField(field: string): TopAuthorInfo[] {
  const normalizedField = field.toLowerCase();
  return ALL_TOP_AUTHORS.filter(author => 
    author.field.some(f => f.toLowerCase().includes(normalizedField))
  );
}

