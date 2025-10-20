/**
 * 实用工具函数
 */

import * as fs from 'fs';
import * as path from 'path';
import { storage } from '../storage/StorageManager.js';

/**
 * 清空工作区所有文件（危险操作）
 */
export async function clearWorkdir(): Promise<{
  success: boolean;
  message: string;
  deletedFiles: number;
}> {
  try {
    const dirs = [
      storage.PDFS_DIR,
      storage.TEXTS_DIR,
      storage.GENERATED_DIR
    ];
    let deletedCount = 0;

    for (const dirPath of dirs) {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      }
    }

    return {
      success: true,
      message: `已清空工作区，删除 ${deletedCount} 个文件`,
      deletedFiles: deletedCount
    };
  } catch (error: any) {
    throw new Error(`清空工作区失败: ${error.message}`);
  }
}

