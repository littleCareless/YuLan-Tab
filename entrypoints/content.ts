export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('链接预览助手已激活');
    
    // 存储原始链接点击行为
    const originalClickHandlers = new WeakMap();
    // 当前预览窗口元素
    let previewContainer: HTMLElement | null = null;
    // 是否启用预览模式
    let previewModeEnabled = false;
    
    // 监听来自后台脚本的消息
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'toggle-preview-mode') {
        previewModeEnabled = !previewModeEnabled;
        console.log(`预览模式: ${previewModeEnabled ? '已启用' : '已禁用'}`);
        
        // 如果禁用预览模式，关闭当前预览窗口
        if (!previewModeEnabled && previewContainer) {
          closePreview();
        }
      }
    });
    
    // 添加全局点击事件监听器
    document.addEventListener('click', handleLinkClick, true);
    document.addEventListener('keydown', handleKeyDown);
    
    // 处理链接点击事件
    function handleLinkClick(event: MouseEvent) {
      if (!previewModeEnabled) return;
      
      // 检查是否按下了 Alt 键
      if (!event.altKey) return;
      
      // 查找被点击的链接元素
      const linkElement = findLinkElement(event.target as HTMLElement);
      if (!linkElement) return;
      
      // 阻止默认行为
      event.preventDefault();
      event.stopPropagation();
      
      // 创建预览窗口
      createPreview(linkElement.href);
    }
    
    // 处理键盘事件
    function handleKeyDown(event: KeyboardEvent) {
      // 按 ESC 键关闭预览窗口
      if (event.key === 'Escape' && previewContainer) {
        closePreview();
      }
    }
    
    // 查找链接元素
    function findLinkElement(element: HTMLElement | null): HTMLAnchorElement | null {
      if (!element) return null;
      
      if (element.tagName === 'A') {
        return element as HTMLAnchorElement;
      }
      
      return findLinkElement(element.parentElement);
    }
    
    // 创建预览窗口
    function createPreview(url: string) {
      // 关闭已存在的预览窗口
      if (previewContainer) {
        closePreview();
      }
      
      // 创建预览容器
      previewContainer = document.createElement('div');
      previewContainer.className = 'yulan-preview-container';
      previewContainer.style.cssText = `
        position: fixed;
        top: 10%;
        left: 10%;
        width: 80%;
        height: 80%;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `;
      
      // 创建预览头部
      const previewHeader = document.createElement('div');
      previewHeader.className = 'yulan-preview-header';
      previewHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background-color: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
        cursor: move;
      `;
      
      // 添加标题
      const previewTitle = document.createElement('div');
      previewTitle.textContent = url;
      previewTitle.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 80%;
      `;
      
      // 添加关闭按钮
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        color: #666;
        cursor: pointer;
        padding: 0 4px;
      `;
      closeButton.addEventListener('click', closePreview);
      
      // 添加打开新窗口按钮
      const openButton = document.createElement('button');
      openButton.textContent = '在新窗口打开';
      openButton.style.cssText = `
        background: none;
        border: none;
        font-size: 14px;
        color: #1a73e8;
        cursor: pointer;
        margin-right: 10px;
      `;
      openButton.addEventListener('click', () => {
        window.open(url, '_blank');
      });
      
      // 添加预览内容
      const previewContent = document.createElement('iframe');
      previewContent.src = url;
      previewContent.style.cssText = `
        flex: 1;
        width: 100%;
        border: none;
      `;
      
      // 添加错误处理
      previewContent.addEventListener('error', handleIframeError);
      
      // 监听iframe加载失败的情况
      function handleIframeError() {
        showFallbackContent(url);
      }
      
      // 组装预览窗口
      previewHeader.appendChild(previewTitle);
      previewHeader.appendChild(openButton);
      previewHeader.appendChild(closeButton);
      previewContainer.appendChild(previewHeader);
      previewContainer.appendChild(previewContent);
      
      // 添加到页面
      document.body.appendChild(previewContainer);
      
      // 实现拖拽功能
      implementDragAndResize(previewContainer, previewHeader);
      
      // 检测CSP错误 - 使用MutationObserver监听iframe加载状态
      setTimeout(() => {
        // 检查iframe是否为空或有错误
        try {
          // 尝试访问iframe内容，如果被CSP阻止会抛出错误
          const iframeDoc = previewContent.contentDocument || previewContent.contentWindow?.document;
          if (!iframeDoc || !iframeDoc.body || iframeDoc.body.innerHTML === '') {
            showFallbackContent(url);
          }
        } catch (error) {
          // 访问被CSP阻止
          // showFallbackContent(url);
        }
      }, 1000); // 给予iframe足够的加载时间
    }
    
    // 显示备用内容
    function showFallbackContent(url: string) {
      if (!previewContainer) return;
      
      // 查找并移除iframe
      const iframe = previewContainer.querySelector('iframe');
      if (iframe) {
        iframe.remove();
      }
      
      // 创建备用内容容器
      const fallbackContent = document.createElement('div');
      fallbackContent.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background-color: #f9f9f9;
        text-align: center;
      `;
      
      // 添加图标
      const icon = document.createElement('div');
      icon.innerHTML = '⚠️';
      icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 16px;
      `;
      
      // 添加错误信息
      const message = document.createElement('div');
      message.innerHTML = `<p>无法在内嵌框架中预览此网站</p><p>该网站的内容安全策略(CSP)不允许在iframe中显示</p>`;
      message.style.cssText = `
        margin-bottom: 20px;
        color: #333;
        font-size: 16px;
        line-height: 1.5;
      `;
      
      // 添加打开按钮
      const openLinkButton = document.createElement('button');
      openLinkButton.textContent = '在新标签页中打开';
      openLinkButton.style.cssText = `
        background-color: #1a73e8;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      openLinkButton.addEventListener('mouseover', () => {
        openLinkButton.style.backgroundColor = '#1765cc';
      });
      openLinkButton.addEventListener('mouseout', () => {
        openLinkButton.style.backgroundColor = '#1a73e8';
      });
      openLinkButton.addEventListener('click', () => {
        window.open(url, '_blank');
      });
      
      // 组装备用内容
      fallbackContent.appendChild(icon);
      fallbackContent.appendChild(message);
      fallbackContent.appendChild(openLinkButton);
      
      // 添加到预览容器
      previewContainer.appendChild(fallbackContent);
    }
    
    // 关闭预览窗口
    function closePreview() {
      if (previewContainer && previewContainer.parentNode) {
        previewContainer.parentNode.removeChild(previewContainer);
        previewContainer = null;
      }
    }
    
    // 实现拖拽和调整大小功能
    function implementDragAndResize(container: HTMLElement, handle: HTMLElement) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;
      let lastUpdateTime = 0;
      let requestId: number | null = null;
      
      // 拖拽开始
      handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(container.style.left || '10%', 10);
        startTop = parseInt(container.style.top || '10%', 10);
        
        // 确保初始位置有效
        if (isNaN(startLeft)) startLeft = window.innerWidth * 0.1;
        if (isNaN(startTop)) startTop = window.innerHeight * 0.1;
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      });
      
      // 处理鼠标移动 - 使用requestAnimationFrame优化性能
      function handleMouseMove(e: MouseEvent) {
        if (!isDragging) return;
        
        // 存储最新的鼠标位置
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        // 使用requestAnimationFrame来平滑更新UI
        if (!requestId) {
          requestId = requestAnimationFrame(() => {
            // 再次检查是否仍在拖拽中，防止鼠标释放后仍然更新位置
            if (!isDragging) {
              requestId = null;
              return;
            }
            
            const now = Date.now();
            // 节流：限制更新频率，每16ms更新一次（约60fps）
            if (now - lastUpdateTime >= 16) {
              const deltaX = currentX - startX;
              const deltaY = currentY - startY;
              
              container.style.left = `${startLeft + deltaX}px`;
              container.style.top = `${startTop + deltaY}px`;
              
              lastUpdateTime = now;
            }
            requestId = null;
          });
        }
      }
      
      // 处理鼠标释放
      function handleMouseUp() {
        console.log('鼠标松开');
        // 立即设置拖拽状态为false，确保不再处理鼠标移动
        isDragging = false;
        
        // 移除事件监听器
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // 取消任何待处理的动画帧
        if (requestId) {
          cancelAnimationFrame(requestId);
          requestId = null;
        }
        
        // 保存最终位置，防止后续意外移动
        startLeft = parseInt(container.style.left, 10);
        startTop = parseInt(container.style.top, 10);
      }
    }
    
    // 清理函数
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      if (previewContainer) {
        closePreview();
      }
    };
  },
});
