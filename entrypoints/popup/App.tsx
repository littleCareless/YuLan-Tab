import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [shortcut, setShortcut] = useState('Alt + 点击链接');

  // 获取当前预览模式状态
  useEffect(() => {
    // 向后台脚本发送消息获取当前状态
    browser.runtime.sendMessage({ action: 'get-preview-status' })
      .then(response => {
        if (response && typeof response.enabled === 'boolean') {
          setPreviewEnabled(response.enabled);
        }
      })
      .catch(error => console.error('获取状态失败:', error));
  }, []);

  // 切换预览模式
  const togglePreviewMode = () => {
    const newState = !previewEnabled;
    setPreviewEnabled(newState);
    
    // 向后台脚本发送切换命令
    browser.runtime.sendMessage({
      action: 'toggle-preview-mode',
      enabled: newState
    }).catch(error => console.error('发送命令失败:', error));
  };

  // 打开快捷键设置页面
  const openShortcutSettings = () => {
    browser.tabs.create({
      url: 'chrome://extensions/shortcuts'
    }).catch(error => {
      // 如果无法直接打开快捷键设置页面，则打开扩展管理页面
      browser.tabs.create({ url: 'chrome://extensions' })
        .catch(e => console.error('打开扩展页面失败:', e));
    });
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>链接预览助手</h1>
      </header>
      
      <main className="popup-content">
        <div className="toggle-section">
          <span>预览模式</span>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={previewEnabled}
              onChange={togglePreviewMode}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="shortcut-section">
          <div className="shortcut-info">
            <span>快捷键</span>
            <div className="shortcut-display">{shortcut}</div>
          </div>
          <button 
            className="shortcut-button"
            onClick={openShortcutSettings}
          >
            修改
          </button>
        </div>
        
        <div className="info-section">
          <p>使用说明:</p>
          <ol>
            <li>启用预览模式</li>
            <li>按住 Alt 键并点击网页链接</li>
            <li>链接内容将在弹窗中预览</li>
            <li>按 ESC 键关闭预览窗口</li>
          </ol>
        </div>
      </main>
      
      <footer className="popup-footer">
        <p>© 2025 链接预览助手</p>
      </footer>
    </div>
  );
}

export default App;
