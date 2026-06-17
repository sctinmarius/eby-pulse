import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

export interface TextFileStorage {
  listFiles(dir: string): Promise<string[]>;
  readText(path: string): Promise<string>;
  ensureDir(dir: string): Promise<void>;
  writeText(path: string, content: string): Promise<void>;
}

export const fileSystemStorage: TextFileStorage = {
  listFiles(dir) {
    return readdir(dir);
  },
  readText(path) {
    return readFile(path, 'utf8');
  },
  async ensureDir(dir) {
    await mkdir(dir, { recursive: true });
  },
  writeText(path, content) {
    return writeFile(path, content, 'utf8');
  },
};
