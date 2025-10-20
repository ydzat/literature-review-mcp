/**
 * LLMProvider 增强功能测试
 */

import dotenv from 'dotenv';
import { createLLMProvider } from '../../llm/LLMProvider.js';

dotenv.config();

async function testLLMProvider() {
  console.log('=== LLMProvider 增强功能测试 ===\n');

  const llm = createLLMProvider();

  // 测试 1: simpleChat 方法
  console.log('📝 测试 1: simpleChat 方法');
  try {
    const response = await llm.simpleChat(
      '请用一句话解释什么是机器学习',
      '你是一个简洁的AI助手'
    );
    console.log(`✅ simpleChat 成功`);
    console.log(`   响应: ${response.substring(0, 100)}...`);
  } catch (error: any) {
    console.log(`❌ simpleChat 失败: ${error.message}`);
  }

  // 测试 2: chatWithCompression 方法（短文本）
  console.log('\n📝 测试 2: chatWithCompression 方法（短文本，无需压缩）');
  try {
    const shortText = '这是一段短文本，用于测试 chatWithCompression 方法。';
    const response = await llm.chatWithCompression(
      shortText,
      '你是一个AI助手，请总结用户的输入'
    );
    console.log(`✅ chatWithCompression（短文本）成功`);
    console.log(`   响应: ${response.substring(0, 100)}...`);
  } catch (error: any) {
    console.log(`❌ chatWithCompression（短文本）失败: ${error.message}`);
  }

  // 测试 3: countTokens 方法
  console.log('\n📝 测试 3: countTokens 方法');
  try {
    const text = '这是一段测试文本，用于计算 token 数量。This is a test text for counting tokens.';
    const tokens = llm.countTokens(text);
    console.log(`✅ countTokens 成功`);
    console.log(`   文本: "${text}"`);
    console.log(`   Token 数: ${tokens}`);
  } catch (error: any) {
    console.log(`❌ countTokens 失败: ${error.message}`);
  }

  // 测试 4: getMaxContextTokens 方法
  console.log('\n📝 测试 4: getMaxContextTokens 方法');
  try {
    const maxContext = llm.getMaxContextTokens();
    const maxOutput = llm.getMaxOutputTokens();
    console.log(`✅ 获取模型限制成功`);
    console.log(`   最大上下文: ${maxContext.toLocaleString()} tokens`);
    console.log(`   最大输出: ${maxOutput.toLocaleString()} tokens`);
  } catch (error: any) {
    console.log(`❌ 获取模型限制失败: ${error.message}`);
  }

  // 测试 5: chatWithCompression 方法（模拟长文本）
  console.log('\n📝 测试 5: chatWithCompression 方法（模拟长文本）');
  try {
    // 生成一个较长的文本（但不会真的触发压缩，除非非常长）
    const longText = `
# 机器学习简介

机器学习是人工智能的一个分支，它使计算机能够在没有明确编程的情况下学习。

## 监督学习
监督学习是一种机器学习方法，其中模型从标记的训练数据中学习。

## 无监督学习
无监督学习是一种机器学习方法，其中模型从未标记的数据中发现模式。

## 强化学习
强化学习是一种机器学习方法，其中智能体通过与环境交互来学习。
`.repeat(10);  // 重复 10 次以增加长度

    const response = await llm.chatWithCompression(
      longText,
      '你是一个AI助手，请总结以下内容的核心要点',
      { temperature: 0.3 }
    );
    console.log(`✅ chatWithCompression（长文本）成功`);
    console.log(`   响应长度: ${response.length} 字符`);
    console.log(`   响应预览: ${response.substring(0, 150)}...`);
  } catch (error: any) {
    console.log(`❌ chatWithCompression（长文本）失败: ${error.message}`);
  }

  console.log('\n✅ 所有测试完成！');
}

testLLMProvider().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

