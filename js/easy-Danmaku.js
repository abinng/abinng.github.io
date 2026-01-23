/**
 * Bilibili 风格弹幕核心逻辑
 * 特性：轨道管理、防重叠、90%滚动/10%静止、描边文字、特殊样式
 */
class EasyDanmaku {
  constructor(options) {
    this.container = document.querySelector(options.el);
    this.options = {
      line: options.line || 10, // 轨道数量
      speed: options.speed || 10, // 滚动速度(秒)
      hover: options.hover || false, // 鼠标悬停暂停
      loop: options.loop || false, // 循环播放
      runtime: options.runtime || 10, // 循环播放时间
    };
    
    // Bilibili 常用色板 (去除过于刺眼的荧光色)
    this.colors = [
      '#FFFFFF', // 白 (高概率)
      '#FFFFFF', 
      '#FFFFFF',
      '#FE0302', // 红
      '#FF7204', // 橙
      '#FFAA02', // 黄
      '#00CD00', // 绿
      '#4266BE', // 蓝
      '#CC0273', // 紫
    ];

    this.tracks = new Array(this.options.line).fill(true); // 轨道状态 true=空闲
    this.danmakuQueue = [];
    this.timer = null;
    this.isPaused = false;
    
    this.init();
  }

  init() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    this.container.style.pointerEvents = 'none'; // 容器本身不阻挡点击，子元素单独设置
    
    // 轨道高度计算
    this.trackHeight = this.container.offsetHeight / this.options.line;
  }

  // 批量发送入口
  batchSend(dataList, isLoop = false) {
    let index = 0;
    // 简单的队列发送逻辑，避免瞬间堆积
    const sendNext = () => {
      if (this.isPaused) return;
      if (index >= dataList.length) {
        if (this.options.loop) {
          index = 0; // 循环
        } else {
          return; // 结束
        }
      }
      
      const item = dataList[index];
      this.send(item);
      index++;
    };

    // 根据数据量调整发射频率，模仿视频弹幕的随机感
    this.timer = setInterval(() => {
      // 每次随机发射 1-2 条，或者不发射
      if(Math.random() > 0.3) sendNext();
    }, 800); 
  }

  // 发送单条弹幕
  send(item) {
    if (!this.container) return;

    // 1. 决定弹幕类型 (90% 滚动, 10% 顶部/底部)
    const rand = Math.random();
    let type = 'scroll';
    if (rand > 0.95) type = 'bottom';
    else if (rand > 0.90) type = 'top';

    // 2. 创建 DOM
    const dom = document.createElement('div');
    dom.innerText = item.content; // 纯文本
    
    // 3. 样式设置
    this.setStyle(dom, type, item);

    // 4. 轨道分配与渲染
    if (type === 'scroll') {
      this.renderScroll(dom);
    } else {
      this.renderStatic(dom, type);
    }
  }

  setStyle(dom, type, item) {
    // 基础 Bilibili 风格
    dom.style.position = 'absolute';
    dom.style.whiteSpace = 'nowrap';
    dom.style.fontFamily = '"黑体", "Heiti SC", sans-serif';
    dom.style.fontWeight = 'bold';
    dom.style.fontSize = `${Math.floor(20 + Math.random() * 6)}px`; // 20-26px 随机大小
    dom.style.textShadow = '1px 0 1px #000, 0 1px 1px #000, 0 -1px 1px #000, -1px 0 1px #000'; // 黑色描边
    dom.style.pointerEvents = 'auto'; // 允许鼠标交互
    dom.style.cursor = 'pointer';
    dom.style.zIndex = 10;
    
    // 颜色随机
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    dom.style.color = color;

    // 特殊样式 (10% 概率出现渐变或边框)
    if (Math.random() < 0.1) {
      if (Math.random() > 0.5) {
        // 渐变色 (模拟高级弹幕)
        dom.style.backgroundImage = 'linear-gradient(to right, #ff00cc, #333399)';
        dom.style.webkitBackgroundClip = 'text';
        dom.style.color = 'transparent';
        dom.style.textShadow = 'none'; // 渐变字通常去掉描边或改用 filter
        dom.style.filter = 'drop-shadow(1px 1px 0px black)';
      } else {
        // 边框 (模拟 UP 主/高亮)
        dom.style.border = `2px solid ${color}`;
        dom.style.borderRadius = '4px';
        dom.style.padding = '0 4px';
        dom.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
      }
    }

    // 交互事件
    if (this.options.hover) {
      dom.onmouseenter = () => {
        dom.style.zIndex = 100;
        dom.style.animationPlayState = 'paused';
      };
      dom.onmouseleave = () => {
        dom.style.zIndex = 10;
        dom.style.animationPlayState = 'running';
      };
    }
  }

  // 渲染滚动弹幕
  renderScroll(dom) {
    // 寻找可用轨道
    let trackIndex = -1;
    // 简单尝试寻找空闲轨道，找不到就随机覆盖
    for(let i = 0; i < this.options.line; i++) {
        if(this.tracks[i]) {
            trackIndex = i;
            break;
        }
    }
    if (trackIndex === -1) trackIndex = Math.floor(Math.random() * this.options.line);

    // 标记轨道占用 (简单处理，实际应根据弹幕宽度计算释放时间)
    this.tracks[trackIndex] = false;
    setTimeout(() => { this.tracks[trackIndex] = true; }, 1500); // 1.5秒后该轨道视为可再次发射

    dom.style.top = `${trackIndex * this.trackHeight}px`;
    dom.style.left = '100%'; // 从右侧开始
    dom.style.transform = 'translateX(0)';
    
    this.container.appendChild(dom);

    // 计算动画时长 (根据文字长度微调，长的跑慢点)
    const duration = this.options.speed + (dom.offsetWidth / 100); 
    
    // 使用 Web Animation API 或 CSS Animation
    const animation = dom.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(-${this.container.offsetWidth + dom.offsetWidth + 20}px)` }
    ], {
      duration: duration * 1000,
      easing: 'linear'
    });

    animation.onfinish = () => {
      dom.remove();
    };
  }

  // 渲染顶部/底部固定弹幕
  renderStatic(dom, type) {
    dom.style.left = '50%';
    dom.style.transform = 'translateX(-50%)'; // 居中
    dom.style.zIndex = 20; // 静态弹幕层级更高
    dom.style.border = '2px solid rgba(255,255,255,0.5)'; // 静态弹幕通常有框
    dom.style.backgroundColor = 'rgba(0,0,0,0.3)'; // 半透明背景增加可读性

    // 随机找个位置，避免完全重叠
    const offset = Math.floor(Math.random() * 3) * this.trackHeight;

    if (type === 'top') {
      dom.style.top = `${offset + 20}px`;
    } else {
      dom.style.bottom = `${offset + 60}px`; // 底部留出空间
    }

    this.container.appendChild(dom);

    // 存活 4 秒后消失
    setTimeout(() => {
      dom.remove();
    }, 4000);
  }
}