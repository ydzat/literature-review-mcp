import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DatabaseManager } from '../database/DatabaseManager.js';

// 存储路径配置
export class StorageManager {
  private static instance: StorageManager;
  
  public readonly STORAGE_ROOT: string;
  public readonly DB_PATH: string;
  public readonly PDFS_DIR: string;
  public readonly TEXTS_DIR: string;
  public readonly GENERATED_DIR: string;  // 生成的文件（wechat, review等）
  public readonly CONFIG_PATH: string;
  
  public db: DatabaseManager;

  private constructor() {
    // 使用用户主目录下的隐藏目录
    this.STORAGE_ROOT = path.join(os.homedir(), '.arxiv-mcp');
    this.DB_PATH = path.join(this.STORAGE_ROOT, 'arxiv-mcp.db');
    this.PDFS_DIR = path.join(this.STORAGE_ROOT, 'pdfs');
    this.TEXTS_DIR = path.join(this.STORAGE_ROOT, 'texts');
    this.GENERATED_DIR = path.join(this.STORAGE_ROOT, 'generated');
    this.CONFIG_PATH = path.join(this.STORAGE_ROOT, 'config.json');
    
    // 初始化目录结构
    this.initDirectories();
    
    // 初始化数据库
    this.db = new DatabaseManager(this.DB_PATH);
    
    console.log('✅ 存储管理器已初始化');
    console.log(`   存储根目录: ${this.STORAGE_ROOT}`);
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private initDirectories(): void {
    const dirs = [
      this.STORAGE_ROOT,
      this.PDFS_DIR,
      this.TEXTS_DIR,
      this.GENERATED_DIR
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ 目录已创建: ${dir}`);
      }
    }
    
    // 初始化配置文件
    if (!fs.existsSync(this.CONFIG_PATH)) {
      const defaultConfig = {
        version: '1.0.0',
        cacheEnabled: true,
        cacheTtl: {
          papers: 7 * 24 * 60 * 60,      // 7 天
          authors: 30 * 24 * 60 * 60,    // 30 天
          apiResponses: 24 * 60 * 60     // 1 天
        },
        pdfRetentionDays: 90,
        notionIntegration: {
          enabled: true,
          autoSync: false
        }
      };
      
      fs.writeFileSync(this.CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      console.log(`✅ 配置文件已创建: ${this.CONFIG_PATH}`);
    }
  }

  // ============================================
  // PDF 管理
  // ============================================

  getPdfPath(arxivId: string): string {
    // 移除版本号（如 v1, v2）
    const cleanId = arxivId.replace(/v\d+$/, '');
    return path.join(this.PDFS_DIR, `${cleanId}.pdf`);
  }

  pdfExists(arxivId: string): boolean {
    return fs.existsSync(this.getPdfPath(arxivId));
  }

  savePdf(arxivId: string, data: Buffer): string {
    const pdfPath = this.getPdfPath(arxivId);
    fs.writeFileSync(pdfPath, data);
    console.log(`✅ PDF 已保存: ${pdfPath}`);
    return pdfPath;
  }

  deletePdf(arxivId: string): void {
    const pdfPath = this.getPdfPath(arxivId);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log(`🗑️ PDF 已删除: ${pdfPath}`);
    }
  }

  // ============================================
  // 文本管理
  // ============================================

  getTextPath(arxivId: string): string {
    const cleanId = arxivId.replace(/v\d+$/, '');
    return path.join(this.TEXTS_DIR, `${cleanId}.txt`);
  }

  textExists(arxivId: string): boolean {
    return fs.existsSync(this.getTextPath(arxivId));
  }

  saveText(arxivId: string, text: string): string {
    const textPath = this.getTextPath(arxivId);
    fs.writeFileSync(textPath, text, 'utf-8');
    console.log(`✅ 文本已保存: ${textPath}`);
    return textPath;
  }

  readText(arxivId: string): string | null {
    const textPath = this.getTextPath(arxivId);
    if (fs.existsSync(textPath)) {
      return fs.readFileSync(textPath, 'utf-8');
    }
    return null;
  }

  deleteText(arxivId: string): void {
    const textPath = this.getTextPath(arxivId);
    if (fs.existsSync(textPath)) {
      fs.unlinkSync(textPath);
      console.log(`🗑️ 文本已删除: ${textPath}`);
    }
  }

  // ============================================
  // 配置管理
  // ============================================

  getConfig(): any {
    if (fs.existsSync(this.CONFIG_PATH)) {
      const content = fs.readFileSync(this.CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  }

  updateConfig(updates: any): void {
    const config = this.getConfig() || {};
    const newConfig = { ...config, ...updates };
    fs.writeFileSync(this.CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    console.log('✅ 配置已更新');
  }

  // ============================================
  // 清理操作
  // ============================================

  cleanOldPdfs(daysOld: number = 90): number {
    const files = fs.readdirSync(this.PDFS_DIR);
    const now = Date.now();
    let count = 0;
    
    for (const file of files) {
      const filePath = path.join(this.PDFS_DIR, file);
      const stats = fs.statSync(filePath);
      const age = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      
      if (age > daysOld) {
        fs.unlinkSync(filePath);
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`🗑️ 已清理 ${count} 个旧 PDF 文件`);
    }
    
    return count;
  }

  cleanOldTexts(daysOld: number = 90): number {
    const files = fs.readdirSync(this.TEXTS_DIR);
    const now = Date.now();
    let count = 0;
    
    for (const file of files) {
      const filePath = path.join(this.TEXTS_DIR, file);
      const stats = fs.statSync(filePath);
      const age = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      
      if (age > daysOld) {
        fs.unlinkSync(filePath);
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`🗑️ 已清理 ${count} 个旧文本文件`);
    }
    
    return count;
  }

  // ============================================
  // 统计信息
  // ============================================

  getStorageStats(): any {
    const pdfFiles = fs.readdirSync(this.PDFS_DIR);
    const textFiles = fs.readdirSync(this.TEXTS_DIR);
    
    let pdfSize = 0;
    for (const file of pdfFiles) {
      const stats = fs.statSync(path.join(this.PDFS_DIR, file));
      pdfSize += stats.size;
    }
    
    let textSize = 0;
    for (const file of textFiles) {
      const stats = fs.statSync(path.join(this.TEXTS_DIR, file));
      textSize += stats.size;
    }
    
    const dbStats = fs.existsSync(this.DB_PATH) 
      ? fs.statSync(this.DB_PATH).size 
      : 0;
    
    return {
      pdfs: {
        count: pdfFiles.length,
        size: pdfSize,
        sizeHuman: this.formatBytes(pdfSize)
      },
      texts: {
        count: textFiles.length,
        size: textSize,
        sizeHuman: this.formatBytes(textSize)
      },
      database: {
        size: dbStats,
        sizeHuman: this.formatBytes(dbStats),
        ...this.db.getStats()
      },
      total: {
        size: pdfSize + textSize + dbStats,
        sizeHuman: this.formatBytes(pdfSize + textSize + dbStats)
      }
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ============================================
  // 关闭
  // ============================================

  close(): void {
    this.db.close();
    console.log('✅ 存储管理器已关闭');
  }
}

// 导出单例实例
export const storage = StorageManager.getInstance();

