import { useState, useEffect } from 'react';
import './style.css';

type TriggerMode = 'alt-hover' | 'alt-click' | 'long-press' | 'drag';

interface TriggerOption {
  mode: TriggerMode;
  label: string;
  description: string;
}

const triggerOptions: TriggerOption[] = [
  {
    mode: 'alt-hover',
    label: 'Alt + 悬停',
    description: '按住 Alt 键并将鼠标悬停在链接上'
  },
  {
    mode: 'alt-click',
    label: 'Alt + 点击',
    description: '按住 Alt 键并点击链接'
  },
  {
    mode: 'long-press',
    label: '长按链接',
    description: '按住链接 0.5 秒'
  },
  {
    mode: 'drag',
    label: '拖动链接',
    description: '轻微拖动链接即可预览'
  }
];

function App() {
  const [triggerMode, setTriggerMode] = useState<TriggerMode>('alt-click');
  const [isLoading, setIsLoading] = useState(true);

  // 获取当前触发方式
  useEffect(() => {
    browser.runtime.sendMessage({ action: 'get-trigger-mode' })
      .then(response => {
        if (response && response.mode) {
          setTriggerMode(response.mode);
        }
      })
      .catch(error => console.error('获取触发方式失败:', error))
      .finally(() => setIsLoading(false));
  }, []);

  // 更新触发方式
  const handleTriggerModeChange = (mode: TriggerMode) => {
    setTriggerMode(mode);
    
    // 向后台脚本发送更新命令
    browser.runtime.sendMessage({
      action: 'update-trigger-mode',
      mode: mode
    }).catch(error => console.error('更新触发方式失败:', error));
  };

  if (isLoading) {
    return (
      <div className="popup-container loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>链接预览助手</h1>
      </header>
      
      <main className="popup-content">
        <div className="trigger-section">
          <span>选择触发方式</span>
          <div className="trigger-options">
            {triggerOptions.map(({ mode, label, description }) => (
              <label key={mode} className="trigger-option">
                <input
                  type="radio"
                  name="triggerMode"
                  value={mode}
                  checked={triggerMode === mode}
                  onChange={() => handleTriggerModeChange(mode)}
                />
                <div className="trigger-option-content">
                  <span className="trigger-option-label">{label}</span>
                  <span className="trigger-option-description">{description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        <div className="info-section">
          <p>使用提示</p>
          <ol>
            <li>选择你喜欢的触发方式来预览链接</li>
            <li>预览窗口支持拖拽移动和调整大小</li>
            <li>按 ESC 键可以快速关闭预览窗口</li>
            <li>支持绝大多数网站的预览功能</li>
          </ol>
        </div>
      </main>
      
      <footer className="popup-footer">
        <p>© 2024 链接预览助手 - 让浏览更轻松</p>
      </footer>
    </div>
  );
}

export default App;
