export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('链接预览助手已激活')

    // 存储原始链接点击行为
    const originalClickHandlers = new WeakMap()
    // 当前预览窗口元素
    let previewContainer: HTMLElement | null = null
    // 当前触发方式 - 更新类型以包含所有模式
    let currentTriggerMode: 'alt-hover' | 'alt-click' | 'long-press' | 'drag' | 'hover' | 'disabled' = 'alt-click'
    // 长按计时器
    let longPressTimer: number | null = null
    // 悬停预览计时器
    let hoverPreviewTimer: number | null = null
    // 拖动起始位置
    let dragStartX = 0
    let dragStartY = 0

    /**
     * @description 请求并设置初始触发模式
     */
    function initializeSettings() {
      browser.runtime.sendMessage({ action: 'get-settings' })
        .then(settings => {
          if (settings && settings.triggerMode) {
            currentTriggerMode = settings.triggerMode
            console.log(`内容脚本：初始触发方式已设置为: ${currentTriggerMode}`)
          }
        })
        .catch(error => {
          console.error('内容脚本：获取初始设置失败:', error)
          // 保留默认的 'alt-click' 或其他回退逻辑
        })
    }

    // 初始化设置
    initializeSettings()

    // 监听来自后台脚本的消息
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'update-trigger-mode') {
        currentTriggerMode = message.mode
        console.log(`内容脚本：触发方式已更新为: ${currentTriggerMode}`)

        // 清除悬停计时器
        if (hoverPreviewTimer) {
          clearTimeout(hoverPreviewTimer)
          hoverPreviewTimer = null
        }

        // 关闭当前预览窗口，因为触发方式已更改
        if (previewContainer) {
          closePreview()
        }
      }
    })

    // 添加事件监听器
    document.addEventListener('mouseover', handleMouseOver, true)
    document.addEventListener('mouseout', handleMouseOut, true)
    document.addEventListener('click', handleClick, true)
    document.addEventListener('mousedown', handleMouseDown, true)
    document.addEventListener('mouseup', handleMouseUp, true)
    document.addEventListener('mousemove', handleMouseMove, true)
    document.addEventListener('keydown', handleKeyDown)

    // 添加Alt键状态监听
    let altKeyPressed = false
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Alt') {
        altKeyPressed = true
      }
    })
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Alt') {
        altKeyPressed = false
      }
    })
    // 当窗口失去焦点时重置Alt键状态
    window.addEventListener('blur', () => {
      altKeyPressed = false
    })

    /**
     * @description 处理鼠标悬停事件，支持 'alt-hover' 和 'hover' 模式
     * @param {MouseEvent} event - 鼠标事件对象
     */
    function handleMouseOver(event: MouseEvent) {
      if (currentTriggerMode === 'disabled') return

      const linkElement = findLinkElement(event.target as HTMLElement)
      if (!linkElement) return

      if (currentTriggerMode === 'alt-hover') {
        // 检查Alt键是否被按下，使用event.altKey和全局altKeyPressed变量双重检查
        if (event.altKey || altKeyPressed) {
          createPreview(linkElement.href)
        }
      } else if (currentTriggerMode === 'hover') {
        // 对于 'hover' 模式，清除可能存在的旧计时器
        if (hoverPreviewTimer) {
          clearTimeout(hoverPreviewTimer)
        }
        // 考虑添加延迟以避免过于敏感的预览
        hoverPreviewTimer = window.setTimeout(() => {
          createPreview(linkElement.href)
          hoverPreviewTimer = null // 清除计时器ID，表示已执行
        }, 300) // 300毫秒延迟
      }
    }

    /**
     * @description 处理鼠标移出事件，支持 'alt-hover' 和 'hover' 模式
     * @param {MouseEvent} event - 鼠标事件对象
     */
    function handleMouseOut(event: MouseEvent) {
      if (currentTriggerMode === 'disabled') return

      // 清除悬停预览计时器
      if (hoverPreviewTimer) {
        clearTimeout(hoverPreviewTimer)
        hoverPreviewTimer = null
      }

      // 仅当是由悬停模式打开时关闭预览
      if (currentTriggerMode === 'alt-hover' || currentTriggerMode === 'hover') {
        // 检查鼠标是否移到了预览窗口自身，如果是则不关闭 (简化处理，暂不实现此逻辑)
        // const relatedTarget = event.relatedTarget as HTMLElement | null;
        // if (previewContainer && previewContainer.contains(relatedTarget)) {
        //   return;
        // }
        closePreview()
      }
    }

    /**
     * @description 处理点击事件，支持 'alt-click' 模式
     * @param {MouseEvent} event - 鼠标事件对象
     */
    function handleClick(event: MouseEvent) {
      if (currentTriggerMode === 'disabled' || currentTriggerMode !== 'alt-click') return
      if (!event.altKey) return

      const linkElement = findLinkElement(event.target as HTMLElement)
      if (!linkElement) return

      // 阻止默认行为
      event.preventDefault()
      event.stopPropagation()

      // 创建预览窗口
      createPreview(linkElement.href)
    }

    // 处理鼠标按下事件
    function handleMouseDown(event: MouseEvent) {
      const linkElement = findLinkElement(event.target as HTMLElement)
      if (!linkElement) return

      if (currentTriggerMode === 'long-press') {
        // 阻止默认行为，防止链接被立即打开
        event.preventDefault()
        // 开始长按计时
        longPressTimer = window.setTimeout(() => {
          createPreview(linkElement.href)
        }, 500)
      } else if (currentTriggerMode === 'drag') {
        // 阻止默认行为，防止链接被立即打开
        event.preventDefault()
        // 记录拖动起始位置
        dragStartX = event.clientX
        dragStartY = event.clientY
      }
    }

    // 处理鼠标松开事件
    function handleMouseUp() {
      // 清除长按计时器
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }

    // 处理鼠标移动事件
    function handleMouseMove(event: MouseEvent) {
      if (currentTriggerMode === 'disabled') return
      if (currentTriggerMode !== 'drag') return

      // 只有当鼠标按下时才处理拖动
      if (event.buttons === 0) return

      const linkElement = findLinkElement(event.target as HTMLElement)
      if (!linkElement) return

      // 计算拖动距离
      const deltaX = event.clientX - dragStartX
      const deltaY = event.clientY - dragStartY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // 如果拖动距离超过阈值，创建预览窗口
      if (distance > 60) { // 进一步降低阈值，使拖动更容易触发
        event.preventDefault()
        createPreview(linkElement.href)
      }
    }

    // 处理键盘事件
    function handleKeyDown(event: KeyboardEvent) {
      // 按 ESC 键关闭预览窗口，无论触发模式如何
      if (event.key === 'Escape' && previewContainer) {
        closePreview()
      }
    }

    // 查找链接元素
    function findLinkElement(element: HTMLElement | null): HTMLAnchorElement | null {
      if (!element) return null

      if (element.tagName === 'A') {
        return element as HTMLAnchorElement
      }

      return findLinkElement(element.parentElement)
    }

    // 创建预览窗口
    function createPreview(url: string) {
      if (currentTriggerMode === 'disabled') return // 双重检查
      // 关闭已存在的预览窗口
      if (previewContainer) {
        closePreview()
      }

      // 计算初始位置 - 窗口居中
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const previewWidth = Math.min(windowWidth * 0.8, 1200) // 最大宽度1200px
      const previewHeight = Math.min(windowHeight * 0.8, 800) // 最大高度800px
      const left = (windowWidth - previewWidth) / 2
      const top = (windowHeight - previewHeight) / 2

      // 创建遮罩层
      const overlay = document.createElement('div')
      overlay.className = 'yulan-overlay'
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.2);
        z-index: 2147483645;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      `
      document.body.appendChild(overlay)

      // 创建预览容器
      previewContainer = document.createElement('div')
      previewContainer.className = 'yulan-preview-container'
      previewContainer.style.cssText = `
        position: fixed;
        top: ${top}px;
        left: ${left}px;
        width: ${previewWidth}px;
        height: ${previewHeight}px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 2147483646;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `

      // 创建预览头部
      const previewHeader = document.createElement('div')
      previewHeader.className = 'yulan-preview-header'
      previewHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background-color: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
        cursor: move;
      `

      // 添加标题
      const previewTitle = document.createElement('div')
      previewTitle.textContent = url
      previewTitle.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 80%;
      `

      // 添加关闭按钮
      const closeButton = document.createElement('button')
      closeButton.innerHTML = '&times;'
      closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        color: #666;
        cursor: pointer;
        padding: 0 4px;
      `
      closeButton.addEventListener('click', closePreview)

      // 添加打开新窗口按钮
      const openButton = document.createElement('button')
      openButton.textContent = '在新窗口打开'
      openButton.style.cssText = `
        background: none;
        border: none;
        font-size: 14px;
        color: #1a73e8;
        cursor: pointer;
        margin-right: 10px;
      `
      openButton.addEventListener('click', () => {
        window.open(url, '_blank')
      })

      // 添加预览内容
      const previewContent = document.createElement('iframe')
      previewContent.src = url
      previewContent.style.cssText = `
        flex: 1;
        width: 100%;
        border: none;
      `

      // 添加错误处理
      previewContent.addEventListener('error', handleIframeError)

      // 监听iframe加载失败的情况
      function handleIframeError() {
        showFallbackContent(url)
      }

      // 组装预览窗口
      previewHeader.appendChild(previewTitle)
      previewHeader.appendChild(openButton)
      previewHeader.appendChild(closeButton)
      previewContainer.appendChild(previewHeader)
      previewContainer.appendChild(previewContent)

      // 添加到页面
      document.body.appendChild(previewContainer)

      // 实现拖拽功能
      implementDragAndResize(previewContainer, previewHeader, overlay)

      // 检测CSP错误 - 使用MutationObserver监听iframe加载状态
      setTimeout(() => {
        // 检查iframe是否为空或有错误
        try {
          // 尝试访问iframe内容，如果被CSP阻止会抛出错误
          const iframeDoc = previewContent.contentDocument || previewContent.contentWindow?.document
          // if (!iframeDoc || !iframeDoc.body || iframeDoc.body.innerHTML === '') {
          //   showFallbackContent(url);
          // }
        } catch (error) {
          // 访问被CSP阻止
          // showFallbackContent(url);
        }
      }, 1000) // 给予iframe足够的加载时间
    }

    // 显示备用内容
    function showFallbackContent(url: string) {
      if (!previewContainer) return

      // 查找并移除iframe
      const iframe = previewContainer.querySelector('iframe')
      if (iframe) {
        iframe.remove()
      }

      // 创建备用内容容器
      const fallbackContent = document.createElement('div')
      fallbackContent.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background-color: #f9f9f9;
        text-align: center;
      `

      // 添加图标
      const icon = document.createElement('div')
      icon.innerHTML = '⚠️'
      icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 16px;
      `

      // 添加错误信息
      const message = document.createElement('div')
      message.innerHTML = `<p>无法在内嵌框架中预览此网站</p><p>该网站的内容安全策略(CSP)不允许在iframe中显示</p>`
      message.style.cssText = `
        margin-bottom: 20px;
        color: #333;
        font-size: 16px;
        line-height: 1.5;
      `

      // 添加打开按钮
      const openLinkButton = document.createElement('button')
      openLinkButton.textContent = '在新标签页中打开'
      openLinkButton.style.cssText = `
        background-color: #1a73e8;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
      `
      openLinkButton.addEventListener('mouseover', () => {
        openLinkButton.style.backgroundColor = '#1765cc'
      })
      openLinkButton.addEventListener('mouseout', () => {
        openLinkButton.style.backgroundColor = '#1a73e8'
      })
      openLinkButton.addEventListener('click', () => {
        window.open(url, '_blank')
      })

      // 组装备用内容
      fallbackContent.appendChild(icon)
      fallbackContent.appendChild(message)
      fallbackContent.appendChild(openLinkButton)

      // 添加到预览容器
      previewContainer.appendChild(fallbackContent)
    }

    // 关闭预览窗口
    function closePreview() {
      if (previewContainer && previewContainer.parentNode) {
        previewContainer.parentNode.removeChild(previewContainer)
        previewContainer = null
      }

      // 移除遮罩层
      const overlay = document.querySelector('.yulan-overlay')
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay)
      }
    }

    // 实现拖拽和调整大小功能
    function implementDragAndResize(container: HTMLElement, handle: HTMLElement, overlay: HTMLElement) {
      let isDragging = false
      let isResizing = false
      let resizeDirection = ''
      let startX = 0
      let startY = 0
      let startLeft = 0
      let startTop = 0
      let startWidth = 0
      let startHeight = 0
      let lastUpdateTime = 0
      let requestId: number | null = null

      // 添加调整大小的控制点
      const resizeHandles = {
        n: createResizeHandle('n'),  // 上
        e: createResizeHandle('e'),  // 右
        s: createResizeHandle('s'),  // 下
        w: createResizeHandle('w'),  // 左
        ne: createResizeHandle('ne'), // 右上
        se: createResizeHandle('se'), // 右下
        sw: createResizeHandle('sw'), // 左下
        nw: createResizeHandle('nw')  // 左上
      }

      // 将调整大小的控制点添加到容器
      Object.values(resizeHandles).forEach(handle => {
        container.appendChild(handle)
      })

      // 创建调整大小的控制点
      function createResizeHandle(direction: string): HTMLElement {
        const handle = document.createElement('div')
        handle.className = `yulan-resize-handle yulan-resize-${direction}`

        // 设置控制点样式
        const baseStyle = `
          position: absolute;
          z-index: 2147483647;
          background-color: #1a73e8;
          opacity: 0.6;
          transition: opacity 0.2s;
        `

        // 根据方向设置不同的样式
        let positionStyle = ''
        let cursorStyle = ''

        // 角落控制点
        if (direction.length === 2) {
          positionStyle = `
            width: 10px;
            height: 10px;
            border-radius: 50%;
          `

          // 设置角落控制点的位置
          if (direction.includes('n')) positionStyle += 'top: -5px;'
          if (direction.includes('s')) positionStyle += 'bottom: -5px;'
          if (direction.includes('e')) positionStyle += 'right: -5px;'
          if (direction.includes('w')) positionStyle += 'left: -5px;'

          // 设置角落控制点的光标
          if (direction === 'ne') cursorStyle = 'cursor: ne-resize;'
          if (direction === 'se') cursorStyle = 'cursor: se-resize;'
          if (direction === 'sw') cursorStyle = 'cursor: sw-resize;'
          if (direction === 'nw') cursorStyle = 'cursor: nw-resize;'
        }
        // 边缘控制点
        else {
          if (direction === 'n' || direction === 's') {
            positionStyle = `
              width: 30%;
              height: 6px;
              left: 35%;
            `
            if (direction === 'n') positionStyle += 'top: -3px;'
            if (direction === 's') positionStyle += 'bottom: -3px;'
            cursorStyle = 'cursor: ns-resize;'
          } else {
            positionStyle = `
              width: 6px;
              height: 30%;
              top: 35%;
            `
            if (direction === 'e') positionStyle += 'right: -3px;'
            if (direction === 'w') positionStyle += 'left: -3px;'
            cursorStyle = 'cursor: ew-resize;'
          }
        }

        handle.style.cssText = baseStyle + positionStyle + cursorStyle

        // 添加鼠标悬停效果
        handle.addEventListener('mouseover', () => {
          handle.style.opacity = '1'
        })

        handle.addEventListener('mouseout', () => {
          if (!isResizing) {
            handle.style.opacity = '0.6'
          }
        })

        // 添加调整大小的事件监听器
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation() // 防止触发容器的拖拽
          startResizing(e, direction)
        })

        return handle
      }

      // 开始调整大小
      function startResizing(e: MouseEvent, direction: string) {
        isResizing = true
        resizeDirection = direction
        startX = e.clientX
        startY = e.clientY

        // 获取当前容器的位置和大小
        const rect = container.getBoundingClientRect()
        startLeft = rect.left
        startTop = rect.top
        startWidth = rect.width
        startHeight = rect.height

        // 禁用 iframe 的指针事件
        const iframe = container.querySelector('iframe')
        if (iframe) {
          iframe.style.pointerEvents = 'none'
        }

        document.addEventListener('mousemove', handleResizeMove)
        document.addEventListener('mouseup', handleResizeUp)
      }

      // 处理调整大小时的鼠标移动
      function handleResizeMove(e: MouseEvent) {
        if (!isResizing) return

        // 阻止默认行为和事件冒泡
        e.preventDefault()
        e.stopPropagation()

        // 存储最新的鼠标位置
        const currentX = e.clientX
        const currentY = e.clientY

        // 使用requestAnimationFrame来平滑更新UI
        if (!requestId) {
          requestId = requestAnimationFrame(() => {
            if (!isResizing) {
              requestId = null
              return
            }

            const deltaX = currentX - startX
            const deltaY = currentY - startY

            // 根据调整方向更新容器的位置和大小
            let newLeft = startLeft
            let newTop = startTop
            let newWidth = startWidth
            let newHeight = startHeight

            // 处理水平方向的调整
            if (resizeDirection.includes('e')) {
              newWidth = Math.max(300, startWidth + deltaX)
            } else if (resizeDirection.includes('w')) {
              const proposedWidth = Math.max(300, startWidth - deltaX)
              if (proposedWidth !== startWidth) {
                newWidth = proposedWidth
                newLeft = startLeft + (startWidth - proposedWidth)
              }
            }

            // 处理垂直方向的调整
            if (resizeDirection.includes('s')) {
              newHeight = Math.max(200, startHeight + deltaY)
            } else if (resizeDirection.includes('n')) {
              const proposedHeight = Math.max(200, startHeight - deltaY)
              if (proposedHeight !== startHeight) {
                newHeight = proposedHeight
                newTop = startTop + (startHeight - proposedHeight)
              }
            }

            // 应用新的尺寸和位置
            container.style.width = `${newWidth}px`
            container.style.height = `${newHeight}px`
            container.style.left = `${newLeft}px`
            container.style.top = `${newTop}px`

            requestId = null
          })
        }
      }

      // 处理调整大小结束
      function handleResizeUp() {
        isResizing = false
        resizeDirection = ''

        // 恢复 iframe 的指针事件
        const iframe = container.querySelector('iframe')
        if (iframe) {
          iframe.style.pointerEvents = 'auto'
        }

        // 移除事件监听器
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeUp)

        // 取消任何待处理的动画帧
        if (requestId) {
          cancelAnimationFrame(requestId)
          requestId = null
        }

        // 更新控制点的透明度
        Object.values(resizeHandles).forEach(handle => {
          handle.style.opacity = '0.6'
        })
      }

      // 处理拖拽移动时的鼠标移动
      function handleMouseMove(e: MouseEvent) {
        if (!isDragging) return

        // 阻止默认行为和事件冒泡
        e.preventDefault()
        e.stopPropagation()

        // 存储最新的鼠标位置
        const currentX = e.clientX
        const currentY = e.clientY

        // 使用requestAnimationFrame来平滑更新UI
        if (!requestId) {
          requestId = requestAnimationFrame(() => {
            if (!isDragging) {
              requestId = null
              return
            }

            const deltaX = currentX - startX
            const deltaY = currentY - startY

            // 计算新位置
            const newLeft = startLeft + deltaX
            const newTop = startTop + deltaY

            // 确保窗口不会完全移出视口
            const maxLeft = window.innerWidth - container.offsetWidth
            const maxTop = window.innerHeight - container.offsetHeight

            container.style.left = `${Math.min(Math.max(0, newLeft), maxLeft)}px`
            container.style.top = `${Math.min(Math.max(0, newTop), maxTop)}px`

            requestId = null
          })
        }
      }

      // 处理拖拽结束
      function handleMouseUp() {
        if (!isDragging) return

        isDragging = false

        // 恢复 iframe 的指针事件
        const iframe = container.querySelector('iframe')
        if (iframe) {
          iframe.style.pointerEvents = 'auto'
        }

        // 移除事件监听器
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)

        // 取消任何待处理的动画帧
        if (requestId) {
          cancelAnimationFrame(requestId)
          requestId = null
        }

        // 更新最终位置
        const rect = container.getBoundingClientRect()
        startLeft = rect.left
        startTop = rect.top
      }

      // 拖拽开始
      handle.addEventListener('mousedown', (e) => {
        // 如果正在调整大小，不启动拖拽
        if (isResizing) return

        // 阻止默认行为和事件冒泡
        e.preventDefault()
        e.stopPropagation()

        isDragging = true
        const rect = container.getBoundingClientRect()
        startX = e.clientX
        startY = e.clientY
        startLeft = rect.left
        startTop = rect.top

        // 禁用 iframe 的指针事件
        const iframe = container.querySelector('iframe')
        if (iframe) {
          iframe.style.pointerEvents = 'none'
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
      })
    }

    // 清理函数
    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('keydown', handleKeyDown)
      if (previewContainer) {
        closePreview()
      }
    }
  },
})
