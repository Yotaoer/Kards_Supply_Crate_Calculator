import { Capacitor } from '@capacitor/core';

let initialized = false;

export function initFooter(): void {
  if (initialized) return;
  initialized = true;
  const copy = document.getElementById('copy-qq') as HTMLButtonElement;
  const number = document.getElementById('qq-number')!;
  const feedback = document.getElementById('copy-status')!;
  copy.addEventListener('click', async () => {
    copy.disabled = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(number.textContent!.trim());
      feedback.textContent = '群号已复制';
    } catch {
      number.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(number);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      feedback.textContent = '未能复制，请选中群号手动复制';
    } finally {
      copy.disabled = false;
    }
  });

  const status = document.getElementById('page-view-status')!;
  if (__NATIVE_OFFLINE__ || Capacitor.isNativePlatform()) {
    status.textContent = '离线版不统计';
    return;
  }
  const host = location.hostname;
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' ||
      host === '[::1]' || host === '::1') {
    status.textContent = '本地预览不统计';
    return;
  }
  const value = document.getElementById('busuanzi_value_page_pv')!;
  const observer = new MutationObserver(() => {
    const text = value.textContent?.trim() ?? '';
    if (/^\d+$/.test(text) && Number.isSafeInteger(Number(text))) {
      finish(`${Number(text).toLocaleString('zh-CN')} 次`);
    }
  });
  const finish = (text: string) => {
    observer.disconnect();
    window.clearTimeout(timeout);
    status.textContent = text;
  };
  const timeout = window.setTimeout(() => finish('统计暂不可用'), 8000);
  observer.observe(value, { childList: true, subtree: true, characterData: true });
  const script = document.createElement('script');
  script.id = 'page-view-script';
  script.async = true;
  script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
  script.onerror = () => finish('统计暂不可用');
  document.head.append(script);
}
