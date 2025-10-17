#!/usr/bin/env node

import { dblp } from './dblp.js';
import { openreview } from './openreview.js';
import { paperswithcode } from './paperswithcode.js';
import { searchAcrossAllSources } from './unified.js';
import { storage } from '../storage/StorageManager.js';

async function testDataSources() {
  console.log('🧪 测试学术数据源集成...\n');

  const query = 'deep learning';
  
  // 测试 DBLP
  console.log('📚 测试 DBLP...');
  try {
    const dblpResults = await dblp.search({ query, maxResults: 5 });
    console.log(`✅ DBLP: 找到 ${dblpResults.papers.length} 篇论文`);
    if (dblpResults.papers.length > 0) {
      console.log(`   示例: ${dblpResults.papers[0].title}`);
    }
  } catch (error) {
    console.error('❌ DBLP 测试失败:', error);
  }
  console.log();
  
  // 测试 OpenReview
  console.log('📚 测试 OpenReview...');
  try {
    const orResults = await openreview.search({ query, maxResults: 5 });
    console.log(`✅ OpenReview: 找到 ${orResults.papers.length} 篇论文`);
    if (orResults.papers.length > 0) {
      console.log(`   示例: ${orResults.papers[0].title}`);
    }
  } catch (error) {
    console.error('❌ OpenReview 测试失败:', error);
  }
  console.log();
  
  // 测试 Papers With Code
  console.log('📚 测试 Papers With Code...');
  try {
    const pwcResults = await paperswithcode.search({ query, maxResults: 5 });
    console.log(`✅ Papers With Code: 找到 ${pwcResults.papers.length} 篇论文`);
    if (pwcResults.papers.length > 0) {
      console.log(`   示例: ${pwcResults.papers[0].title}`);
    }
  } catch (error) {
    console.error('❌ Papers With Code 测试失败:', error);
  }
  console.log();
  
  // 测试统一搜索
  console.log('🔍 测试统一搜索（跨所有数据源）...');
  try {
    const unifiedResults = await searchAcrossAllSources({
      query,
      maxResults: 10,
      sources: ['dblp', 'openreview', 'paperswithcode']
    });
    console.log(`✅ 统一搜索: 找到 ${unifiedResults.papers.length} 篇论文（去重后）`);
    console.log('\n前 3 篇论文:');
    unifiedResults.papers.slice(0, 3).forEach((paper, i) => {
      console.log(`${i + 1}. ${paper.title}`);
      console.log(`   来源: ${paper.source} | 作者: ${paper.authors.slice(0, 2).join(', ')}...`);
    });
  } catch (error) {
    console.error('❌ 统一搜索测试失败:', error);
  }
  console.log();
  
  console.log('✅ 所有测试完成！');
  
  // 关闭数据库
  storage.close();
}

testDataSources().catch(console.error);

