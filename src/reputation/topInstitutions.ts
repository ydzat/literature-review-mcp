/**
 * 顶级机构数据库
 * 用于评估论文作者所属机构的声誉
 */

export interface InstitutionInfo {
  name: string;
  tier: 'top-tier' | 'tier-1' | 'tier-2';
  tierScore: number;
  country: string;
  aliases?: string[];  // 别名
}

/**
 * Top-tier 机构（评分 90-100）
 * 全球顶尖 AI/CS 研究机构
 */
export const TOP_TIER_INSTITUTIONS: InstitutionInfo[] = [
  // 美国顶级实验室
  { name: 'Google DeepMind', tier: 'top-tier', tierScore: 100, country: 'UK/USA', aliases: ['DeepMind', 'Google Brain'] },
  { name: 'OpenAI', tier: 'top-tier', tierScore: 100, country: 'USA' },
  { name: 'Meta AI', tier: 'top-tier', tierScore: 98, country: 'USA', aliases: ['Facebook AI', 'FAIR'] },
  { name: 'Microsoft Research', tier: 'top-tier', tierScore: 98, country: 'USA', aliases: ['MSR'] },
  { name: 'Google Research', tier: 'top-tier', tierScore: 98, country: 'USA' },
  
  // 美国顶级大学
  { name: 'MIT', tier: 'top-tier', tierScore: 100, country: 'USA', aliases: ['Massachusetts Institute of Technology'] },
  { name: 'Stanford University', tier: 'top-tier', tierScore: 100, country: 'USA', aliases: ['Stanford'] },
  { name: 'Carnegie Mellon University', tier: 'top-tier', tierScore: 98, country: 'USA', aliases: ['CMU'] },
  { name: 'UC Berkeley', tier: 'top-tier', tierScore: 98, country: 'USA', aliases: ['University of California Berkeley', 'Berkeley'] },
  { name: 'Princeton University', tier: 'top-tier', tierScore: 95, country: 'USA', aliases: ['Princeton'] },
  { name: 'Harvard University', tier: 'top-tier', tierScore: 95, country: 'USA', aliases: ['Harvard'] },
  
  // 欧洲顶级机构
  { name: 'ETH Zurich', tier: 'top-tier', tierScore: 95, country: 'Switzerland', aliases: ['ETH'] },
  { name: 'University of Oxford', tier: 'top-tier', tierScore: 95, country: 'UK', aliases: ['Oxford'] },
  { name: 'University of Cambridge', tier: 'top-tier', tierScore: 95, country: 'UK', aliases: ['Cambridge'] },
  
  // 亚洲顶级机构
  { name: 'Tsinghua University', tier: 'top-tier', tierScore: 92, country: 'China', aliases: ['清华大学'] },
  { name: 'Peking University', tier: 'top-tier', tierScore: 92, country: 'China', aliases: ['北京大学', 'PKU'] },
];

/**
 * Tier-1 机构（评分 75-89）
 * 优秀的研究机构
 */
export const TIER_1_INSTITUTIONS: InstitutionInfo[] = [
  // 美国
  { name: 'Cornell University', tier: 'tier-1', tierScore: 88, country: 'USA' },
  { name: 'University of Washington', tier: 'tier-1', tierScore: 88, country: 'USA', aliases: ['UW'] },
  { name: 'Georgia Tech', tier: 'tier-1', tierScore: 85, country: 'USA', aliases: ['Georgia Institute of Technology'] },
  { name: 'University of Illinois', tier: 'tier-1', tierScore: 85, country: 'USA', aliases: ['UIUC'] },
  { name: 'University of Michigan', tier: 'tier-1', tierScore: 85, country: 'USA' },
  { name: 'Columbia University', tier: 'tier-1', tierScore: 82, country: 'USA' },
  { name: 'NYU', tier: 'tier-1', tierScore: 82, country: 'USA', aliases: ['New York University'] },
  { name: 'University of Texas', tier: 'tier-1', tierScore: 80, country: 'USA', aliases: ['UT Austin'] },
  { name: 'UCLA', tier: 'tier-1', tierScore: 80, country: 'USA', aliases: ['University of California Los Angeles'] },
  { name: 'UCSD', tier: 'tier-1', tierScore: 80, country: 'USA', aliases: ['UC San Diego'] },
  
  // 欧洲
  { name: 'Imperial College London', tier: 'tier-1', tierScore: 85, country: 'UK' },
  { name: 'UCL', tier: 'tier-1', tierScore: 85, country: 'UK', aliases: ['University College London'] },
  { name: 'EPFL', tier: 'tier-1', tierScore: 85, country: 'Switzerland' },
  { name: 'Technical University of Munich', tier: 'tier-1', tierScore: 82, country: 'Germany', aliases: ['TUM'] },
  
  // 亚洲
  { name: 'University of Tokyo', tier: 'tier-1', tierScore: 85, country: 'Japan' },
  { name: 'National University of Singapore', tier: 'tier-1', tierScore: 85, country: 'Singapore', aliases: ['NUS'] },
  { name: 'Nanyang Technological University', tier: 'tier-1', tierScore: 82, country: 'Singapore', aliases: ['NTU'] },
  { name: 'Shanghai Jiao Tong University', tier: 'tier-1', tierScore: 82, country: 'China', aliases: ['上海交通大学', 'SJTU'] },
  { name: 'Zhejiang University', tier: 'tier-1', tierScore: 80, country: 'China', aliases: ['浙江大学', 'ZJU'] },
  { name: 'Fudan University', tier: 'tier-1', tierScore: 78, country: 'China', aliases: ['复旦大学'] },
  
  // 工业实验室
  { name: 'IBM Research', tier: 'tier-1', tierScore: 85, country: 'USA' },
  { name: 'Amazon', tier: 'tier-1', tierScore: 82, country: 'USA', aliases: ['Amazon Web Services', 'AWS'] },
  { name: 'Apple', tier: 'tier-1', tierScore: 80, country: 'USA' },
  { name: 'NVIDIA', tier: 'tier-1', tierScore: 80, country: 'USA' },
  { name: 'Baidu', tier: 'tier-1', tierScore: 78, country: 'China', aliases: ['百度'] },
  { name: 'Alibaba', tier: 'tier-1', tierScore: 78, country: 'China', aliases: ['阿里巴巴'] },
  { name: 'Tencent', tier: 'tier-1', tierScore: 78, country: 'China', aliases: ['腾讯'] },
];

/**
 * Tier-2 机构（评分 60-74）
 * 良好的研究机构
 */
export const TIER_2_INSTITUTIONS: InstitutionInfo[] = [
  { name: 'University of Southern California', tier: 'tier-2', tierScore: 72, country: 'USA', aliases: ['USC'] },
  { name: 'Boston University', tier: 'tier-2', tierScore: 70, country: 'USA', aliases: ['BU'] },
  { name: 'University of Pennsylvania', tier: 'tier-2', tierScore: 70, country: 'USA', aliases: ['UPenn'] },
  { name: 'Duke University', tier: 'tier-2', tierScore: 68, country: 'USA' },
  { name: 'Northwestern University', tier: 'tier-2', tierScore: 68, country: 'USA' },
  { name: 'University of Maryland', tier: 'tier-2', tierScore: 65, country: 'USA', aliases: ['UMD'] },
  { name: 'Purdue University', tier: 'tier-2', tierScore: 65, country: 'USA' },
  { name: 'University of Wisconsin', tier: 'tier-2', tierScore: 65, country: 'USA' },
  
  // 中国其他高校
  { name: 'Harbin Institute of Technology', tier: 'tier-2', tierScore: 72, country: 'China', aliases: ['哈尔滨工业大学', 'HIT'] },
  { name: 'University of Science and Technology of China', tier: 'tier-2', tierScore: 72, country: 'China', aliases: ['中国科学技术大学', 'USTC'] },
  { name: 'Nanjing University', tier: 'tier-2', tierScore: 70, country: 'China', aliases: ['南京大学', 'NJU'] },
  { name: 'Beihang University', tier: 'tier-2', tierScore: 68, country: 'China', aliases: ['北京航空航天大学'] },
  { name: 'Xi\'an Jiaotong University', tier: 'tier-2', tierScore: 65, country: 'China', aliases: ['西安交通大学'] },
];

/**
 * 所有机构的合并列表
 */
export const ALL_INSTITUTIONS = [
  ...TOP_TIER_INSTITUTIONS,
  ...TIER_1_INSTITUTIONS,
  ...TIER_2_INSTITUTIONS
];

/**
 * 根据机构名称查找机构信息
 */
export function findInstitution(name: string): InstitutionInfo | null {
  const normalizedName = name.toLowerCase().trim();
  
  for (const inst of ALL_INSTITUTIONS) {
    // 检查主名称
    if (inst.name.toLowerCase() === normalizedName) {
      return inst;
    }
    
    // 检查别名
    if (inst.aliases) {
      for (const alias of inst.aliases) {
        if (alias.toLowerCase() === normalizedName) {
          return inst;
        }
      }
    }
    
    // 模糊匹配
    if (normalizedName.includes(inst.name.toLowerCase()) || 
        inst.name.toLowerCase().includes(normalizedName)) {
      return inst;
    }
  }
  
  return null;
}

/**
 * 获取机构评分
 */
export function getInstitutionScore(name: string): number {
  const inst = findInstitution(name);
  return inst ? inst.tierScore : 50; // 默认评分 50
}

/**
 * 判断是否为顶级机构
 */
export function isTopTierInstitution(name: string): boolean {
  const inst = findInstitution(name);
  return inst?.tier === 'top-tier';
}

