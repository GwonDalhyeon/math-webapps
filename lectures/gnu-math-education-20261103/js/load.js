/* 그림이 준비된 뒤 화면을 시작한다. 공용 코드 하나가 누락됐다고 모든 그림을
   정지 이미지로 바꾸고 재생 단추를 없애지 않도록, 의존 순서와 로딩 결과를 확인한다. */
(function () {
  const entry = new URL(document.currentScript.src);
  const version = entry.searchParams.get('v') || '';
  const hasPart = (name) => (window.PARTS || []).some((p) => p.name === name);
  const files = [
    ['core/wave1d.js', () => !!window.Wave1D],
    ['core/plot.js', () => !!window.PLOT],
    ['parts/string-lab.js', () => hasPart('string-lab')],
    ['figs/u12.js', () => !!(window.FIGS && window.FIGS['c08-saddle'])],
    ['figs/u34.js', () => !!(window.FIGS && window.FIGS['m05-tradeoff'])],
    ['figs/u5.js', () => !!window.U5],
    ['figs/u67.js', () => !!window.U67],
    ['parts/fig.js', () => !!window.FIGPART],
    ['deck.js', () => !!window.DECK],
  ];

  function load(path, ready, attempt) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const url = new URL(path, entry);
      if (version) url.searchParams.set('v', version);
      if (attempt) url.searchParams.set('retry', String(attempt));
      script.src = url.href;
      script.async = false;
      const timer = setTimeout(() => finish(new Error('불러오기 시간 초과: ' + path)), 15000);
      function finish(error) {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) script.remove();
        error ? reject(error) : resolve();
      }
      script.onload = () => finish(ready() ? null : new Error('그림 코드 준비 안 됨: ' + path));
      script.onerror = () => finish(new Error('그림 코드 불러오기 실패: ' + path));
      document.head.appendChild(script);
    });
  }

  async function start() {
    for (const [path, ready] of files) {
      for (let attempt = 0; ; attempt++) {
        try { await load(path, ready, attempt); break; }
        catch (error) { if (attempt >= 1) throw error; }
      }
    }
    document.body.dataset.deckReady = '1';
  }

  start().catch((error) => {
    console.error(error);
    document.body.dataset.deckReady = 'error';
    const message = document.createElement('div');
    message.className = 'load-error';
    message.textContent = '움직이는 그림을 불러오지 못했습니다. ';
    const retry = document.createElement('button');
    retry.textContent = '다시 불러오기';
    retry.onclick = () => location.reload();
    message.appendChild(retry);
    document.body.appendChild(message);
  });
})();
