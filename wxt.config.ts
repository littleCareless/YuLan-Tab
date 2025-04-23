import { defineConfig } from 'wxt';

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
  },
  modules: ['@wxt-dev/module-react'],
});
