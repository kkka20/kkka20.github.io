import type { CommentConfig } from "@/types/commentConfig";

export const commentConfig: CommentConfig = {
  // 评论系统总开关
  enabled: true,

  // 评论系统类型；新增提供商时在对应配置块中填写选项
  type: "giscus",

  artalk: {
    // Artalk 后端 API 地址；启用评论前请填写
    server: "",

    // 是否启用正式站点的文章浏览量统计
    visitorCount: false,
  },

  giscus: {
    // 仓库全名，格式为 用户名/仓库名
    repo: "kkka20/kkka20.github.io",

    // 以下两项由 https://giscus.app 生成
    repoId: "R_kgDOUWO8OA",
    category: "Announcements",
    categoryId: "DIC_kwDOUWO8OM4DKpB3",

    // 文章与 Discussion 的映射方式
    mapping: "pathname",

    // 标题严格匹配
    strict: false,

    // 是否启用表情回应
    reactionsEnabled: true,

    // 评论框位置
    inputPosition: "bottom",

    // 界面语言
    lang: "zh-CN",
  },
};

export const isCommentViewCountEnabled =
  commentConfig.enabled && commentConfig.type === "artalk" && commentConfig.artalk.visitorCount;
