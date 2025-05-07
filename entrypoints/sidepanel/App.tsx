import { useState, useEffect } from 'react';
import './style.css';

type TriggerMode = 'alt-hover' | 'alt-click' | 'long-press' | 'drag' | 'hover' | 'disabled';
type PopupSize = 'small' | 'medium' | 'large';
type PopupPosition = 'cursor' | 'left' | 'center' | 'right' | 'last';
type PopupTheme = 'light' | 'dark';

interface TriggerOption {
  mode: TriggerMode;
  label: string;
  description: string;
}

interface SizeOption {
  size: PopupSize;
  label: string;
}

interface PositionOption {
  position: PopupPosition;
  label: string;
}

interface ThemeOption {
  theme: PopupTheme;
  label: string;
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
  },
  {
    mode: 'hover',
    label: '悬停',
    description: '鼠标悬停在链接上即可预览'
  },
  {
    mode: 'disabled',
    label: '禁用',
    description: '关闭链接预览功能'
  }
];

const sizeOptions: SizeOption[] = [
  {
    size: 'small',
    label: '小'
  },
  {
    size: 'medium',
    label: '中'
  },
  {
    size: 'large',
    label: '大'
  }
];

const positionOptions: PositionOption[] = [
  {
    position: 'cursor',
    label: '跟随鼠标'
  },
  {
    position: 'left',
    label: '左侧'
  },
  {
    position: 'center',
    label: '中间'
  },
  {
    position: 'right',
    label: '右侧'
  },
  {
    position: 'last',
    label: '上次位置'
  }
];

const themeOptions: ThemeOption[] = [
  {
    theme: 'light',
    label: '浅色'
  },
  {
    theme: 'dark',
    label: '深色'
  }
];

function App() {
  const [triggerMode, setTriggerMode] = useState<TriggerMode>('alt-click');
  const [popupSize, setPopupSize] = useState<PopupSize>('medium');
  const [popupPosition, setPopupPosition] = useState<PopupPosition>('cursor');
  const [popupTheme, setPopupTheme] = useState<PopupTheme>('light');
  const [isLoading, setIsLoading] = useState(true);

  // 获取当前设置
  useEffect(() => {
    browser.runtime.sendMessage({ action: 'get-settings' })
      .then(response => {
        if (response) {
          if (response.mode) setTriggerMode(response.mode);
          if (response.size) setPopupSize(response.size);
          if (response.position) setPopupPosition(response.position);
          if (response.theme) setPopupTheme(response.theme);
        }
      })
      .catch(error => console.error('获取设置失败:', error))
      .finally(() => setIsLoading(false));
  }, []);

  // 更新触发方式
  const handleTriggerModeChange = (mode: TriggerMode) => {
    setTriggerMode(mode);
    
    // 向后台脚本发送更新命令
    browser.runtime.sendMessage({
      action: 'update-setting',
      setting: 'mode',
      value: mode
    }).catch(error => console.error('更新触发方式失败:', error));
  };

  // 更新弹窗大小
  const handlePopupSizeChange = (size: PopupSize) => {
    setPopupSize(size);
    
    // 向后台脚本发送更新命令
    browser.runtime.sendMessage({
      action: 'update-setting',
      setting: 'size',
      value: size
    }).catch(error => console.error('更新弹窗大小失败:', error));
  };

  // 更新弹窗位置
  const handlePopupPositionChange = (position: PopupPosition) => {
    setPopupPosition(position);
    
    // 向后台脚本发送更新命令
    browser.runtime.sendMessage({
      action: 'update-setting',
      setting: 'position',
      value: position
    }).catch(error => console.error('更新弹窗位置失败:', error));
  };

  // 更新弹窗主题
  const handlePopupThemeChange = (theme: PopupTheme) => {
    setPopupTheme(theme);
    
    // 向后台脚本发送更新命令
    browser.runtime.sendMessage({
      action: 'update-setting',
      setting: 'theme',
      value: theme
    }).catch(error => console.error('更新弹窗主题失败:', error));
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
        <div className="setting-section">
          <span className="setting-title">触发方式</span>
          <div className="setting-options">
            <select 
              className="styled-select" 
              value={triggerMode} 
              onChange={(e) => handleTriggerModeChange(e.target.value as TriggerMode)}
            >
              {triggerOptions.map(({ mode, label }) => (
                <option key={mode} value={mode}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="setting-section">
          <span className="setting-title">弹窗大小</span>
          <div className="setting-options">
            <select 
              className="styled-select" 
              value={popupSize} 
              onChange={(e) => handlePopupSizeChange(e.target.value as PopupSize)}
            >
              {sizeOptions.map(({ size, label }) => (
                <option key={size} value={size}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="setting-section">
          <span className="setting-title">弹窗位置</span>
          <div className="setting-options">
            <select 
              className="styled-select" 
              value={popupPosition} 
              onChange={(e) => handlePopupPositionChange(e.target.value as PopupPosition)}
            >
              {positionOptions.map(({ position, label }) => (
                <option key={position} value={position}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="setting-section">
          <span className="setting-title">弹窗主题</span>
          <div className="setting-options">
            <select 
              className="styled-select" 
              value={popupTheme} 
              onChange={(e) => handlePopupThemeChange(e.target.value as PopupTheme)}
            >
              {themeOptions.map(({ theme, label }) => (
                <option key={theme} value={theme}>{label}</option>
              ))}
            </select>
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
