export default defineBackground(() => {
  console.log('链接预览助手后台脚本已启动', { id: browser.runtime.id });

  // 存储预览模式状态
  let previewModeEnabled = false;

  // 监听快捷键命令
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-preview') {
      // 切换预览模式状态
      previewModeEnabled = !previewModeEnabled;
      console.log(`预览模式: ${previewModeEnabled ? '已启用' : '已禁用'}`);

      // 获取当前活动标签页
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        // 向内容脚本发送消息
        browser.tabs.sendMessage(tabs[0].id!, {
          action: 'toggle-preview-mode',
          enabled: previewModeEnabled
        }).catch(error => {
          console.error('发送消息失败:', error);
        });
      }
    }
  });

  // 监听标签页更新，重置预览模式
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete' && previewModeEnabled) {
      // 当页面完全加载后，如果预览模式已启用，则通知内容脚本
      browser.tabs.sendMessage(tabId, {
        action: 'toggle-preview-mode',
        enabled: previewModeEnabled
      }).catch(() => {
        // 忽略错误，可能是内容脚本尚未加载
      });
    }
  });
  
  // 监听来自弹出窗口的消息
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 获取预览模式状态
    if (message.action === 'get-preview-status') {
      sendResponse({ enabled: previewModeEnabled });
      return true; // 表示将异步发送响应
    }
    
    // 切换预览模式
    if (message.action === 'toggle-preview-mode') {
      previewModeEnabled = message.enabled;
      console.log(`预览模式(从弹出窗口): ${previewModeEnabled ? '已启用' : '已禁用'}`);
      
      // 获取当前活动标签页并发送消息
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs.length > 0) {
          browser.tabs.sendMessage(tabs[0].id!, {
            action: 'toggle-preview-mode',
            enabled: previewModeEnabled
          }).catch(error => {
            console.error('发送消息失败:', error);
          });
        }
      });
      
      return true;
    }
  });
});
