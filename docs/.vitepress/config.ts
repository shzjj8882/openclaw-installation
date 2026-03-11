import { defineConfig } from "vitepress";
import { iconParkIcons } from "./iconpark";

export default defineConfig({
  title: "OpenClaw 安装助手",
  description: "OpenClaw 图形化安装助手 - 让 AI 助手触手可及",
  base: "/openclaw-installation/",
  lang: "zh-CN",
  head: [
    ["link", { rel: "icon", href: "/logo-dark.svg", type: "image/svg+xml" }],
  ],
  themeConfig: {
    logo: {
      src: "/logo-dark.svg",
      alt: "OpenClaw Logo",
    },
    nav: [
      { text: "首页", link: "/" },
      { text: "下载", link: "/guide/download" },
      { text: "功能概览", link: "/guide/overview" },
      { text: "安装流程", link: "/guide/install" },
      { text: "GitHub", link: "https://github.com/shzjj8882/openclaw-installation" },
    ],
    sidebar: [
      {
        text: "入门",
        items: [
          { text: "项目简介", link: "/" },
          { text: "下载", link: "/guide/download" },
          { text: "功能概览", link: "/guide/overview" },
          { text: "安装流程", link: "/guide/install" },
        ],
      },
    ],
    socialLinks: [
      { icon: { svg: iconParkIcons.github }, link: "https://github.com/shzjj8882/openclaw-installation" },
    ],
    footer: {
      message: "OpenClaw 安装助手 · 图形化引导，让 AI 助手触手可及",
      copyright: "MIT License",
    },
  },
  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
  },
});
