import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: '链接预览助手',
    description: '通过快捷键触发链接预览功能，无需跳转即可查看链接内容',
    permissions: ['storage', 'activeTab', 'scripting'],
    commands: {
      'toggle-preview': {
        suggested_key: {
          default: 'Alt+P',
        },
        description: '触发链接预览功能',
      },
    },
    "action": {
      "default_icon": {
        "16": "icon/16.png",
        "32": "icon/32.png",
        "48": "icon/48.png",
        "96": "icon/96.png",
        "128": "icon/128.png"
      },
      "default_title": "链接预览助手"
    },
  },
  modules: ['@wxt-dev/module-react'],
})
