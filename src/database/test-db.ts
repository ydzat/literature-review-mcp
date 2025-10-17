#!/usr/bin/env node

import { storage } from '../storage/StorageManager.js';

console.log('🧪 测试数据库功能...\n');

// 测试 1: 插入论文
console.log('📝 测试 1: 插入论文');
const paperId = storage.db.insertPaper({
  arxiv_id: '1706.03762',
  title: 'Attention Is All You Need',
  abstract: 'The dominant sequence transduction models...',
  year: 2017,
  publication_date: '2017-06-12',
  venue: 'NeurIPS',
  venue_rank: 'A*',
  citation_count: 50000,
  source: 'arxiv',
  quality_score: 95.5
});
console.log(`✅ 论文已插入，ID: ${paperId}\n`);

// 测试 2: 查询论文
console.log('🔍 测试 2: 查询论文');
const paper = storage.db.getPaperByArxivId('1706.03762');
console.log('✅ 查询结果:', paper?.title);
console.log(`   引用数: ${paper?.citation_count}\n`);

// 测试 3: 插入作者
console.log('👤 测试 3: 插入作者');
const author1Id = storage.db.insertAuthor({
  name: 'Ashish Vaswani',
  h_index: 50,
  total_citations: 100000,
  current_affiliation: 'Google Brain',
  is_top_author: true,
  reputation_score: 90
});
console.log(`✅ 作者已插入，ID: ${author1Id}\n`);

// 测试 4: 插入机构
console.log('🏛️ 测试 4: 插入机构');
const instId = storage.db.insertInstitution({
  name: 'Google Brain',
  tier: 'top-tier',
  tier_score: 95,
  country: 'USA'
});
console.log(`✅ 机构已插入，ID: ${instId}\n`);

// 测试 5: 建立关系
console.log('🔗 测试 5: 建立论文-作者关系');
storage.db.linkPaperAuthor(paperId, author1Id, 1);
console.log('✅ 关系已建立\n');

// 测试 6: 查询作者的论文
console.log('📚 测试 6: 查询作者的论文');
const authorPapers = storage.db.getPapersByAuthor('Ashish Vaswani');
console.log(`✅ 找到 ${authorPapers.length} 篇论文`);
authorPapers.forEach(p => console.log(`   - ${p.title}`));
console.log();

// 测试 7: 缓存操作
console.log('💾 测试 7: 缓存操作');
storage.db.setCache('test_key', { data: 'test_value' }, 60);
const cached = storage.db.getCache('test_key');
console.log('✅ 缓存写入和读取成功:', cached);
console.log();

// 测试 8: 搜索论文
console.log('🔎 测试 8: 搜索论文');
const results = storage.db.searchPapers({
  minCitations: 1000,
  yearRange: [2015, 2020],
  limit: 10
});
console.log(`✅ 找到 ${results.length} 篇论文\n`);

// 测试 9: 统计信息
console.log('📊 测试 9: 数据库统计');
const stats = storage.db.getStats();
console.log('✅ 统计信息:', stats);
console.log();

// 测试 10: 存储统计
console.log('💽 测试 10: 存储统计');
const storageStats = storage.getStorageStats();
console.log('✅ 存储统计:');
console.log(`   PDF: ${storageStats.pdfs.count} 个文件 (${storageStats.pdfs.sizeHuman})`);
console.log(`   文本: ${storageStats.texts.count} 个文件 (${storageStats.texts.sizeHuman})`);
console.log(`   数据库: ${storageStats.database.sizeHuman}`);
console.log(`   总计: ${storageStats.total.sizeHuman}`);
console.log();

console.log('✅ 所有测试通过！');

// 关闭数据库
storage.close();

