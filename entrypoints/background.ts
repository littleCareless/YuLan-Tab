export default defineBackground(() => {
  console.log('链接预览助手后台脚本已启动', { id: browser.runtime.id })

  // 定义设置的类型，与 App.tsx 保持一致
  type TriggerMode = 'alt-hover' | 'alt-click' | 'long-press' | 'drag' | 'hover' | 'disabled'
  type PopupSize = 'small' | 'medium' | 'large'
  type PopupPosition = 'cursor' | 'left' | 'center' | 'right' | 'last'
  type PopupTheme = 'light' | 'dark'

  // 存储当前设置，并提供默认值
  let currentSettings = {
    triggerMode: 'alt-click' as TriggerMode,
    popupSize: 'medium' as PopupSize,
    popupPosition: 'cursor' as PopupPosition,
    popupTheme: 'light' as PopupTheme,
  }

  let settingsLoadedPromise: Promise<void>
  let resolveSettingsLoaded: () => void
  let rejectSettingsLoaded: (reason?: any) => void

  /**
   * @description 初始化设置加载 Promise
   */
  function initializeSettingsPromise() {
    settingsLoadedPromise = new Promise((resolve, reject) => {
      resolveSettingsLoaded = resolve
      rejectSettingsLoaded = reject
    })
  }

  // 初始化 Promise
  initializeSettingsPromise()

  /**
   * @description 从浏览器存储中加载设置
   */
  async function loadSettings() {
    try {
      const storedSettings = await browser.storage.local.get([
        'triggerMode',
        'popupSize',
        'popupPosition',
        'popupTheme',
      ])
      if (storedSettings.triggerMode) {
        currentSettings.triggerMode = storedSettings.triggerMode as TriggerMode
      }
      if (storedSettings.popupSize) {
        currentSettings.popupSize = storedSettings.popupSize as PopupSize
      }
      if (storedSettings.popupPosition) {
        currentSettings.popupPosition = storedSettings.popupPosition as PopupPosition
      }
      if (storedSettings.popupTheme) {
        currentSettings.popupTheme = storedSettings.popupTheme as PopupTheme
      }
      console.log('设置已从存储中加载:', currentSettings)
      resolveSettingsLoaded() // 设置加载完成后 resolve Promise
    } catch (error) {
      console.error('从存储加载设置失败:', error)
      rejectSettingsLoaded(error) // 加载失败时 reject Promise
    }
  }

  // 脚本启动时加载设置
  loadSettings()

  /**
   * @description 将当前触发模式通知到所有活动的内容脚本
   * @param mode 要通知的触发模式
   */
  async function broadcastTriggerMode(mode: TriggerMode) {
    await settingsLoadedPromise // 等待设置加载完成
    browser.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          browser.tabs
            .sendMessage(tab.id, {
              action: 'update-trigger-mode',
              mode: mode,
            })
            .catch(() => {
              // console.warn(`发送消息到 tab ${tab.id} 失败，可能内容脚本未注入或页面不支持`);
            })
        }
      })
    })
  }

  // 监听快捷键命令
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-preview') {
      await settingsLoadedPromise // 等待设置加载完成
      // 获取当前活动标签页
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })
      if (tabs.length > 0 && tabs[0].id) {
        // 向内容脚本发送消息，使用当前已加载/更新的触发模式
        browser.tabs
          .sendMessage(tabs[0].id, {
            action: 'update-trigger-mode', // 确保 content.ts 监听此 action
            mode: currentSettings.triggerMode,
          })
          .catch((error) => {
            console.error('发送快捷键触发消息失败:', error)
          })
      }
    }
  })

  // 监听标签页更新
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      await settingsLoadedPromise // 等待设置加载完成
      // 当页面完全加载后，通知内容脚本当前的触发方式
      // 确保发送的是最新的设置
      browser.tabs
        .sendMessage(tabId, {
          action: 'update-trigger-mode',
          mode: currentSettings.triggerMode,
        })
        .catch(() => {
          // 忽略错误，可能是内容脚本尚未加载或页面不支持
        })
    }
  })

  // 监听来自弹出窗口 (App.tsx) 或其他地方的消息
  browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    /**
     * @description 处理获取当前所有设置的请求
     */
    if (message.action === 'get-settings') {
      try {
        await settingsLoadedPromise // 等待设置加载完成
        sendResponse(currentSettings)
      } catch (error) {
        console.error('等待设置加载时出错 (get-settings):', error)
        // 可以选择发送一个错误响应或默认设置
        sendResponse({ error: 'Failed to load settings' })
      }
      return true // 异步响应
    }

    /**
     * @description 处理更新单个设置的请求
     */
    if (message.action === 'update-setting') {
      await settingsLoadedPromise // 确保在更新前设置已加载，尽管此时可能不是严格必须，但保持一致性
      const { setting, value } = message
      let settingUpdated = false

      switch (setting) {
        case 'mode':
          currentSettings.triggerMode = value as TriggerMode
          await browser.storage.local.set({ triggerMode: value }) // 确保等待存储完成
          console.log(`触发方式已更新: ${value}`)
          await broadcastTriggerMode(value as TriggerMode) // 确保等待广播完成
          settingUpdated = true
          break
        case 'size':
          currentSettings.popupSize = value as PopupSize
          browser.storage.local.set({ popupSize: value })
          console.log(`弹窗大小已更新: ${value}`)
          settingUpdated = true
          break
        case 'position':
          currentSettings.popupPosition = value as PopupPosition
          browser.storage.local.set({ popupPosition: value })
          console.log(`弹窗位置已更新: ${value}`)
          settingUpdated = true
          break
        case 'theme':
          currentSettings.popupTheme = value as PopupTheme
          browser.storage.local.set({ popupTheme: value })
          console.log(`弹窗主题已更新: ${value}`)
          settingUpdated = true
          break
        default:
          console.warn(`未知的设置项: ${setting}`)
      }

      if (settingUpdated) {
        sendResponse({ success: true, message: `${setting} 已更新为 ${value}` })
      } else {
        sendResponse({ success: false, message: `更新失败或未知设置项: ${setting}` })
      }
      return true // 异步响应或已处理
    }

    // 保留旧的 get-trigger-mode 以防万一，但建议迁移到 get-settings
    if (message.action === 'get-trigger-mode') {
      try {
        await settingsLoadedPromise // 等待设置加载完成
        sendResponse({ mode: currentSettings.triggerMode })
      } catch (error) {
        console.error('等待设置加载时出错 (get-trigger-mode):', error)
        sendResponse({ error: 'Failed to load settings' })
      }
      return true
    }

    // 旧的 update-trigger-mode 消息处理器，如果其他地方还在用，可以保留
    // 但 App.tsx 现在应该使用 update-setting
    if (message.action === 'update-trigger-mode' && message.from !== 'content-script-init') {
      // 避免 content.ts 初始化时自己触发的 update-trigger-mode 消息循环
      const newMode = message.mode as TriggerMode
      try {
        await settingsLoadedPromise // 等待设置加载完成
        if (currentSettings.triggerMode !== newMode) {
          currentSettings.triggerMode = newMode
          await browser.storage.local.set({ triggerMode: newMode }) // 确保 await
          console.log(`通过旧接口更新触发方式: ${newMode}`)
          broadcastTriggerMode(newMode)
          sendResponse({ success: true, message: `触发方式已通过旧接口更新为 ${newMode}` })
        } else {
          sendResponse({ success: false, message: '模式未改变' })
        }
      } catch (error) {
        console.error('通过旧接口更新触发方式失败:', error)
        sendResponse({ success: false, message: '更新触发方式时发生错误' })
      }
      return true
    }
    // 对于未处理的消息，返回 false 或不调用 sendResponse，以允许其他监听器处理
    // return false; // 如果确定没有其他监听器，可以省略
  })

  // 监听扩展图标点击事件
  browser.action.onClicked.addListener((tab) => {
    if (tab.id) {
      // 打开侧边栏
      browser.sidePanel.open({
        tabId: tab.id,
      })
    }
  })
})