export default defineBackground(() => {
  console.log('链接预览助手后台脚本已启动', { id: browser.runtime.id })

  // 存储触发方式
  let currentTriggerMode = 'alt-click'

  // 监听快捷键命令
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-preview') {
      // 获取当前活动标签页
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })
      if (tabs.length > 0) {
        // 向内容脚本发送消息
        browser.tabs.sendMessage(tabs[0].id!, {
          action: 'update-trigger-mode',
          mode: currentTriggerMode
        }).catch(error => {
          console.error('发送消息失败:', error)
        })
      }
    }
  })

  // 监听标签页更新
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
      // 当页面完全加载后，通知内容脚本当前的触发方式
      browser.tabs.sendMessage(tabId, {
        action: 'update-trigger-mode',
        mode: currentTriggerMode
      }).catch(() => {
        // 忽略错误，可能是内容脚本尚未加载
      })
    }
  })

  // 监听来自弹出窗口的消息
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 获取触发方式
    if (message.action === 'get-trigger-mode') {
      sendResponse({ mode: currentTriggerMode })
      return true
    }

    // 更新触发方式
    if (message.action === 'update-trigger-mode') {
      currentTriggerMode = message.mode
      console.log(`触发方式已更新: ${currentTriggerMode}`)

      // 获取当前活动标签页并发送消息
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs.length > 0) {
          browser.tabs.sendMessage(tabs[0].id!, {
            action: 'update-trigger-mode',
            mode: currentTriggerMode
          }).catch(error => {
            console.error('发送消息失败:', error)
          })
        }
      })

      return true
    }
  })

  // 监听扩展图标点击事件
  browser.action.onClicked.addListener((tab) => {
    // 打开侧边栏
    browser.sidePanel.open({
      tabId: tab.id!,
      // path: 'src/sidebar/index.html'
    })
  })
})
