import { customAlphabet } from "nanoid";

// 使用自定义字符集，避免容易混淆的字符
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 7); // 7位，加上P前缀共8位

/**
 * 生成项目短ID
 * @returns P开头的8位短ID，例如：P1a2b3c4
 */
export function generateShortId(): string {
  return "P" + nanoid();
}
