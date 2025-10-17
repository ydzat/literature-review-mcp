#!/usr/bin/env node

import { searchWithNotionOutput } from '../sources/unified.js';
import { storage } from '../storage/StorageManager.js';

async function testNotionOutput() {
  console.log('🧪 测试 Notion 输出格式...\n');
  
  try {
    // 搜索论文
    const result = await searchWithNotionOutput({
      query: 'deep learning',
      maxResults: 5,
      sources: ['dblp', 'openreview']
    });
    
    console.log('✅ 搜索完成\n');
    console.log('📊 数据摘要:');
    console.log(`   ${result.summary}\n`);
    
    console.log('📚 Notion 元数据结构:');
    console.log(`   数据库数量: ${result.notion_metadata.databases?.length || 0}`);
    console.log(`   页面数量: ${result.notion_metadata.pages?.length || 0}\n`);
    
    if (result.notion_metadata.databases && result.notion_metadata.databases.length > 0) {
      const db = result.notion_metadata.databases[0];
      console.log(`📋 数据库: ${db.schema.title}`);
      console.log(`   属性数量: ${db.schema.properties.length}`);
      console.log(`   条目数量: ${db.entries.length}`);
      console.log(`   属性列表:`);
      db.schema.properties.forEach(prop => {
        console.log(`     - ${prop.name} (${prop.type})`);
      });
      console.log();
      
      if (db.entries.length > 0) {
        console.log('📄 示例条目:');
        const entry = db.entries[0];
        console.log(`   标题: ${entry.properties['标题']}`);
        console.log(`   作者: ${entry.properties['作者'].slice(0, 3).join(', ')}...`);
        console.log(`   质量评分: ${entry.properties['质量评分']}`);
        console.log(`   是否最新: ${entry.properties['是否最新']}`);
        console.log();
      }
    }
    
    console.log('📖 使用说明:');
    console.log(result.notion_metadata.instructions);
    console.log();
    
    // 输出完整 JSON（可以直接复制到 Notion）
    console.log('💾 完整 JSON 输出（可保存到文件）:');
    console.log(JSON.stringify(result.notion_metadata, null, 2).substring(0, 500) + '...\n');
    
    console.log('✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    storage.close();
  }
}

testNotionOutput().catch(console.error);

