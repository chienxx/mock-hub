import { fakerZH_CN as faker } from "@faker-js/faker";

/**
 * 解析Faker.js模板
 * 使用原生Faker.js语法
 */
export function parseFakerTemplate(template: unknown): unknown {
  if (template === null || template === undefined) {
    return template;
  }

  try {
    // 如果是字符串，尝试解析为JSON
    if (typeof template === "string") {
      try {
        const parsed = JSON.parse(template);
        return processFakerTemplate(parsed);
      } catch {
        // 不是JSON字符串，可能是faker表达式
        return evaluateFakerExpression(template);
      }
    }

    // 递归处理对象和数组
    if (typeof template === "object") {
      return processFakerTemplate(template);
    }

    // 其他类型直接返回
    return template;
  } catch (error) {
    console.error("Faker.js parsing error:", error);
    return template;
  }
}

/**
 * 递归处理Faker模板
 */
function processFakerTemplate(template: unknown): unknown {
  // 处理数组
  if (Array.isArray(template)) {
    return template.map((item) => processFakerTemplate(item));
  }

  // 处理对象
  if (template && typeof template === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
      // 检查是否是特殊规则key
      if (key.startsWith("_repeat_")) {
        // 处理重复生成规则 "_repeat_10": {...}
        const count = parseInt(key.replace("_repeat_", ""));
        if (!isNaN(count) && typeof value === "object") {
          return Array.from({ length: count }, () =>
            processFakerTemplate(value),
          );
        }
      } else if (key.startsWith("_range_")) {
        // 处理范围规则 "_range_1_10": "{{faker.number.int}}"
        const [min, max] = key.replace("_range_", "").split("_").map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          return faker.number.int({ min, max });
        }
      } else {
        // 普通字段，递归处理值
        result[key] = processFakerValue(value);
      }
    }

    return result;
  }

  return template;
}

/**
 * 处理单个Faker值
 */
function processFakerValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // 处理字符串类型的Faker表达式
  if (typeof value === "string") {
    return evaluateFakerExpression(value);
  }

  // 递归处理嵌套结构
  if (typeof value === "object") {
    return processFakerTemplate(value);
  }

  return value;
}

/**
 * 评估Faker表达式
 * 支持 {{faker.module.method}} 语法
 */
function evaluateFakerExpression(expression: string): unknown {
  // 检查是否包含Faker表达式
  const fakerPattern = /\{\{faker\.([a-zA-Z.]+)(\((.*?)\))?\}\}/g;

  if (!fakerPattern.test(expression)) {
    return expression;
  }

  // 重置正则表达式
  fakerPattern.lastIndex = 0;

  // 替换所有Faker表达式
  return expression.replace(fakerPattern, (match, path, _hasParams, params) => {
    try {
      const parts = path.split(".");
      let current: unknown = faker;

      // 导航到目标方法
      for (let i = 0; i < parts.length - 1; i++) {
        if (
          typeof current === "object" &&
          current !== null &&
          parts[i] in current
        ) {
          current = (current as Record<string, unknown>)[parts[i]];
        } else {
          console.warn(
            `Faker path not found: ${parts.slice(0, i + 1).join(".")}`,
          );
          return match;
        }
      }

      const methodName = parts[parts.length - 1];
      const method =
        typeof current === "object" && current !== null
          ? (current as Record<string, unknown>)[methodName]
          : undefined;

      if (typeof method === "function") {
        // 解析参数
        if (params) {
          try {
            // 尝试将参数解析为JSON
            const args = JSON.parse(`[${params}]`);
            return method.apply(current, args);
          } catch {
            // 如果不是有效的JSON，作为单个字符串参数
            return method.call(current, params);
          }
        }
        return method.call(current);
      } else if (method !== undefined) {
        // 如果是属性而不是方法
        return method;
      }

      console.warn(`Faker method not found: ${path}`);
      return match;
    } catch (error) {
      console.error(`Error evaluating faker expression: ${match}`, error);
      return match;
    }
  });
}

/**
 * 验证Faker模板是否有效
 */
export function validateFakerTemplate(template: unknown): {
  valid: boolean;
  error?: string;
} {
  try {
    parseFakerTemplate(template);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "无效的Faker模板",
    };
  }
}

/**
 * Faker.js 模板示例
 */
export const fakerTemplates = {
  // 用户信息
  user: {
    id: "{{faker.string.uuid}}",
    name: "{{faker.person.fullName}}",
    email: "{{faker.internet.email}}",
    avatar: "{{faker.image.avatar}}",
    bio: "{{faker.person.bio}}",
    phone: "{{faker.phone.number}}",
    address: {
      street: "{{faker.location.streetAddress}}",
      city: "{{faker.location.city}}",
      state: "{{faker.location.state}}",
      zipCode: "{{faker.location.zipCode}}",
      country: "{{faker.location.country}}",
    },
    createdAt: "{{faker.date.past}}",
    updatedAt: "{{faker.date.recent}}",
  },

  // 产品信息
  product: {
    id: "{{faker.string.uuid}}",
    name: "{{faker.commerce.productName}}",
    description: "{{faker.commerce.productDescription}}",
    price: "{{faker.commerce.price}}",
    department: "{{faker.commerce.department}}",
    material: "{{faker.commerce.productMaterial}}",
    color: "{{faker.color.human}}",
    inStock: "{{faker.datatype.boolean}}",
    rating: '{{faker.number.float({"min": 1, "max": 5, "fractionDigits": 1})}}',
    reviews: '{{faker.number.int({"min": 0, "max": 1000})}}',
  },

  // 公司信息
  company: {
    id: "{{faker.string.uuid}}",
    name: "{{faker.company.name}}",
    catchPhrase: "{{faker.company.catchPhrase}}",
    bs: "{{faker.company.buzzPhrase}}",
    industry: "{{faker.commerce.department}}",
    employees: '{{faker.number.int({"min": 10, "max": 10000})}}',
    founded: '{{faker.date.past({"years": 50})}}',
    website: "{{faker.internet.url}}",
    email: "{{faker.internet.email}}",
    phone: "{{faker.phone.number}}",
  },

  // 文章/博客
  article: {
    id: "{{faker.string.uuid}}",
    title: "{{faker.lorem.sentence}}",
    slug: "{{faker.lorem.slug}}",
    content: "{{faker.lorem.paragraphs(5)}}",
    excerpt: "{{faker.lorem.paragraph}}",
    author: "{{faker.person.fullName}}",
    tags: "_repeat_3",
    publishedAt: "{{faker.date.recent}}",
    views: '{{faker.number.int({"min": 0, "max": 10000})}}',
    likes: '{{faker.number.int({"min": 0, "max": 1000})}}',
  },

  // 列表数据
  list: {
    total: '{{faker.number.int({"min": 50, "max": 200})}}',
    page: 1,
    pageSize: 10,
    items: {
      _repeat_10: {
        id: "{{faker.string.uuid}}",
        title: "{{faker.lorem.sentence}}",
        description: "{{faker.lorem.paragraph}}",
        status:
          '{{faker.helpers.arrayElement(["pending", "processing", "completed", "failed"])}}',
        createdAt: "{{faker.date.recent}}",
        updatedAt: "{{faker.date.recent}}",
      },
    },
  },

  // API响应
  response: {
    success: "{{faker.datatype.boolean}}",
    code: 200,
    message: "Success",
    data: {},
    timestamp: "{{faker.date.recent}}",
  },
};

/**
 * Faker.js 常用语法提示
 */
export const fakerSyntaxHints = [
  // 基础数据类型
  {
    category: "基础类型",
    label: "{{faker.datatype.boolean}}",
    description: "布尔值",
  },
  { category: "基础类型", label: "{{faker.number.int}}", description: "整数" },
  {
    category: "基础类型",
    label: "{{faker.number.float}}",
    description: "浮点数",
  },
  { category: "基础类型", label: "{{faker.string.uuid}}", description: "UUID" },
  {
    category: "基础类型",
    label: "{{faker.string.alpha(10)}}",
    description: "字母字符串",
  },
  {
    category: "基础类型",
    label: "{{faker.string.numeric(6)}}",
    description: "数字字符串",
  },

  // 个人信息
  {
    category: "个人信息",
    label: "{{faker.person.fullName}}",
    description: "完整姓名",
  },
  {
    category: "个人信息",
    label: "{{faker.person.firstName}}",
    description: "名",
  },
  {
    category: "个人信息",
    label: "{{faker.person.lastName}}",
    description: "姓",
  },
  {
    category: "个人信息",
    label: "{{faker.person.jobTitle}}",
    description: "职位",
  },
  {
    category: "个人信息",
    label: "{{faker.person.bio}}",
    description: "个人简介",
  },

  // 互联网
  {
    category: "互联网",
    label: "{{faker.internet.email}}",
    description: "邮箱",
  },
  {
    category: "互联网",
    label: "{{faker.internet.userName}}",
    description: "用户名",
  },
  {
    category: "互联网",
    label: "{{faker.internet.password}}",
    description: "密码",
  },
  { category: "互联网", label: "{{faker.internet.url}}", description: "URL" },
  { category: "互联网", label: "{{faker.internet.ip}}", description: "IP地址" },
  {
    category: "互联网",
    label: "{{faker.internet.mac}}",
    description: "MAC地址",
  },
  {
    category: "互联网",
    label: "{{faker.internet.userAgent}}",
    description: "User Agent",
  },

  // 日期时间
  {
    category: "日期时间",
    label: "{{faker.date.recent}}",
    description: "最近日期",
  },
  {
    category: "日期时间",
    label: "{{faker.date.past}}",
    description: "过去日期",
  },
  {
    category: "日期时间",
    label: "{{faker.date.future}}",
    description: "未来日期",
  },
  {
    category: "日期时间",
    label: "{{faker.date.between}}",
    description: "日期范围",
  },
  {
    category: "日期时间",
    label: "{{faker.date.birthdate}}",
    description: "生日",
  },

  // 地址位置
  {
    category: "地址",
    label: "{{faker.location.streetAddress}}",
    description: "街道地址",
  },
  { category: "地址", label: "{{faker.location.city}}", description: "城市" },
  { category: "地址", label: "{{faker.location.state}}", description: "省/州" },
  {
    category: "地址",
    label: "{{faker.location.country}}",
    description: "国家",
  },
  {
    category: "地址",
    label: "{{faker.location.zipCode}}",
    description: "邮编",
  },
  {
    category: "地址",
    label: "{{faker.location.latitude}}",
    description: "纬度",
  },
  {
    category: "地址",
    label: "{{faker.location.longitude}}",
    description: "经度",
  },

  // 商业
  {
    category: "商业",
    label: "{{faker.commerce.productName}}",
    description: "产品名称",
  },
  { category: "商业", label: "{{faker.commerce.price}}", description: "价格" },
  {
    category: "商业",
    label: "{{faker.commerce.department}}",
    description: "部门",
  },
  {
    category: "商业",
    label: "{{faker.commerce.productDescription}}",
    description: "产品描述",
  },
  {
    category: "商业",
    label: "{{faker.company.name}}",
    description: "公司名称",
  },
  {
    category: "商业",
    label: "{{faker.company.catchPhrase}}",
    description: "公司口号",
  },

  // 文本内容
  { category: "文本", label: "{{faker.lorem.word}}", description: "单词" },
  { category: "文本", label: "{{faker.lorem.sentence}}", description: "句子" },
  { category: "文本", label: "{{faker.lorem.paragraph}}", description: "段落" },
  {
    category: "文本",
    label: "{{faker.lorem.paragraphs(3)}}",
    description: "多段落",
  },
  { category: "文本", label: "{{faker.lorem.slug}}", description: "URL slug" },
  { category: "文本", label: "{{faker.lorem.lines}}", description: "多行文本" },

  // 图片
  { category: "图片", label: "{{faker.image.url}}", description: "图片URL" },
  { category: "图片", label: "{{faker.image.avatar}}", description: "头像" },
  {
    category: "图片",
    label: "{{faker.image.dataUri}}",
    description: "Data URI图片",
  },

  // 其他
  {
    category: "其他",
    label: "{{faker.phone.number}}",
    description: "电话号码",
  },
  { category: "其他", label: "{{faker.color.human}}", description: "颜色名称" },
  { category: "其他", label: "{{faker.color.rgb}}", description: "RGB颜色" },
  {
    category: "其他",
    label: '{{faker.helpers.arrayElement(["a","b","c"])}}',
    description: "数组随机元素",
  },
  {
    category: "其他",
    label: "{{faker.helpers.shuffle}}",
    description: "数组随机排序",
  },
];
