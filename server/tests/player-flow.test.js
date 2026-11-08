import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const requireClient = createRequire(new URL('../../client/package.json', import.meta.url));

test('player can stay in each game, settle rounds and choose the next stake', async (t) => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = requireClient('react');
  const { act } = React;
  const { createRoot } = requireClient('react-dom/client');
  const { QueryClient, QueryClientProvider } = await import('../../client/node_modules/@tanstack/react-query/build/modern/index.js');
  const { default: axios } = await import('../../client/node_modules/axios/index.js');
  const oldAdapter = axios.defaults.adapter;
  let balance = 5;
  let sequence = 0;
  let failComplete = true;
  const history = [];
  const stakes = [];
  const scores = [];
  const games = [
    { id: 'slots', name: 'Slot Machine', pointCost: 0.5 },
    { id: 'crash', name: 'Crash Rocket', pointCost: 0.5 },
    { id: 'chain', name: 'Number Chain', pointCost: 0.5 },
  ];
  const frames = new Map();
  let frameId = 0;
  t.mock.method(dom.window.HTMLCanvasElement.prototype, 'getContext', () => null);
  globalThis.requestAnimationFrame = (cb) => { frames.set(++frameId, cb); return frameId; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  axios.defaults.adapter = async (config) => {
    const url = config.url;
    let data;
    if (url === '/api/wallet') data = { wallet: { balance } };
    else if (url === '/api/games/history') data = { items: [...history] };
    else if (url === '/api/games') data = { items: games };
    else if (url === '/api/notifications') data = { items: [] };
    else if (url.endsWith('/outcome')) data = { forcedScore: history[0].gameId === 'slots' ? 0 : null };
    else if (url.endsWith('/play')) {
      const { stake } = JSON.parse(config.data);
      stakes.push(stake);
      balance -= stake;
      const game = games.find((g) => url.endsWith(`/${g.id}/play`));
      const session = { id: `round-${++sequence}`, gameId: game.id, gameName: game.name, pointsSpent: stake, status: 'in_progress', score: null };
      history.unshift(session);
      data = { session };
    } else if (url.endsWith('/complete')) {
      if (failComplete) { failComplete = false; throw new Error('Temporary connection failure'); }
      const { score } = JSON.parse(config.data);
      Object.assign(history[0], { status: 'completed', score });
      scores.push(score);
      if (history[0].gameId !== 'chain') balance += score;
      data = { session: { ...history[0] } };
    } else throw new Error(`Unexpected request: ${url}`);
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const { default: GameLauncher, useGameLauncher } = await import('../../client/src/components/player/GameLauncher.tsx');
  const [game, crash, chain] = games;
  let launcher;
  function Harness() {
    launcher = useGameLauncher(games);
    return React.createElement(GameLauncher, { l: launcher });
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  const root = createRoot(document.getElementById('root'));
  t.after(async () => {
    await act(async () => root.unmount());
    client.clear();
    axios.defaults.adapter = oldAdapter;
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });
  const flush = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 40)); }); };
  await act(async () => root.render(React.createElement(QueryClientProvider, { client }, React.createElement(Harness))));
  await flush();
  await act(async () => launcher.pick(game));
  const typeStake = async (value) => {
    await act(async () => {
      const input = document.querySelector('[aria-label="Stake points"]');
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
  };
  for (const value of ['', '0.25', '0.75', '1000001', '-1']) {
    await typeStake(value);
    assert.equal(launcher.stakeValid, false, `Invalid stake: ${value}`);
    assert.ok([...document.querySelectorAll('button')].find((b) => b.textContent.includes('Play now')).disabled);
    await act(async () => launcher.confirm());
    assert.equal(stakes.length, 0);
  }
  await typeStake('2.5');
  assert.equal(launcher.stake, 2.5);
  assert.equal(launcher.stakeValid, true);
  await act(async () => document.querySelector('[aria-label="Increase stake"]').click());
  assert.equal(launcher.stake, 3);
  await act(async () => document.querySelector('[aria-label="Decrease stake"]').click());
  assert.equal(launcher.stake, 2.5);
  await typeStake('0.5');
  const increase = document.querySelector('[aria-label="Increase stake"]');
  assert.ok(increase);
  await act(async () => increase.click());
  assert.equal(launcher.stake, 1);
  await act(async () => { launcher.confirm(); launcher.confirm(); });
  await flush();
  assert.deepEqual(stakes, [1]);
  assert.equal(launcher.session.id, 'round-1');
  assert.match(document.body.textContent, /Balance: 4 pts/);
  assert.doesNotMatch(document.body.textContent, /Exit/);
  await act(async () => launcher.finish(1.5));
  await flush();
  assert.match(document.body.textContent, /Retry saving result/);
  assert.equal(launcher.pendingScore, 1.5);
  assert.ok(document.querySelector('[inert]'));
  await act(async () => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Retry saving result').click());
  await flush();
  assert.equal(launcher.result.session.score, 1.5);
  assert.equal(balance, 5.5);
  assert.match(document.body.textContent, /Start next round/);
  assert.match(document.body.textContent, /Balance: 5.5 pts/);
  assert.doesNotMatch(document.body.textContent, /Exit game|Play again|Back to lobby/);
  assert.deepEqual(stakes, [1]);
  await typeStake('');
  assert.ok([...document.querySelectorAll('button')].find((b) => b.textContent === 'Start next round').disabled);
  await act(async () => launcher.replay());
  assert.deepEqual(stakes, [1]);
  await typeStake('1.5');
  await act(async () => { launcher.replay(); launcher.replay(); });
  await flush();
  assert.equal(launcher.session.id, 'round-2');
  assert.equal(launcher.result, null);
  assert.deepEqual(stakes, [1, 1.5]);
  await act(async () => launcher.quit());
  await flush();
  assert.equal(launcher.resumable.id, 'round-2');
  await act(async () => launcher.resume());
  assert.equal(launcher.session.id, 'round-2');
  assert.equal(launcher.stake, 1.5);

  const clickButton = async (label) => {
    const button = [...document.querySelectorAll('button')].find((b) => label.test(b.textContent));
    assert.ok(button, `Expected button ${label}`);
    await act(async () => button.click());
  };
  await clickButton(/PULL LEVER/);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 2250)); });
  await flush();
  assert.equal(launcher.result.session.score, 0);
  assert.match(document.body.textContent, /Start next round/);
  assert.match(document.body.textContent, /Balance: 4 pts/);
  assert.deepEqual(stakes, [1, 1.5]);

  await act(async () => launcher.quit());
  await act(async () => launcher.pick(crash));
  await clickButton(/Play now/);
  await flush();
  // A deterministic random roll gives the flight enough time for a manual cash-out.
  const restoreRandom = t.mock.method(crypto, 'getRandomValues', (buf) => {
    buf[0] = 0xc0000000;
    buf[1] = 0;
    return buf;
  });
  const flightStart = performance.now();
  await clickButton(/LAUNCH/);
  await flush();
  const runFrame = async (elapsed) => {
    const frame = [...frames.entries()][0];
    assert.ok(frame, 'Expected a scheduled flight frame');
    frames.delete(frame[0]);
    await act(async () => frame[1](flightStart + elapsed));
  };
  const canvas = document.querySelector('canvas');
  await runFrame(2000);
  await clickButton(/CASH OUT/);
  await flush();
  assert.ok(launcher.result.session.score > 0);
  assert.match(document.body.textContent, /Cashed out at/);
  assert.match(document.body.textContent, new RegExp(`Balance: ${balance} pts`));
  assert.doesNotMatch(document.body.textContent, /Start next round|Crashed at/);
  const scoreCount = scores.length;
  await runFrame(4000);
  assert.equal(document.querySelector('canvas'), canvas);
  assert.doesNotMatch(document.body.textContent, /Crashed at/);
  await runFrame(20000);
  await flush();
  assert.match(document.body.textContent, /Crashed at/);
  assert.match(document.body.textContent, /Start next round/);
  assert.equal(scores.length, scoreCount);
  restoreRandom.mock.restore();

  await act(async () => launcher.quit());
  await act(async () => launcher.pick(chain));
  await clickButton(/Play now/);
  await flush();
  const afterChainBuyIn = balance;
  for (let number = 1; number <= 16; number += 1) await clickButton(new RegExp(`^${number}$`));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });
  await flush();
  assert.ok(launcher.result.session.score > 0);
  assert.equal(balance, afterChainBuyIn);
  assert.match(document.body.textContent, /Start next round/);
  assert.doesNotMatch(document.body.textContent, /Exit game|Play again/);

  const { BrowserRouter } = await import('../../client/node_modules/react-router-dom/dist/index.mjs');
  const { default: PlayerApp } = await import('../../client/src/components/player/PlayerApp.tsx');
  dom.window.history.replaceState(null, '', '/arcade');
  await act(async () => root.render(
    React.createElement(QueryClientProvider, { client },
      React.createElement(BrowserRouter, null,
        React.createElement(PlayerApp, { user: { id: 'player', username: 'Player' } }),
      ),
    ),
  ));
  await flush();
  await clickButton(/Slot Machine/);
  await clickButton(/Play now/);
  await flush();
  assert.ok(dom.window.history.state.usr.playerGame);
  assert.match(document.body.textContent, /PULL LEVER/);
  await act(async () => dom.window.history.back());
  await flush();
  assert.equal(dom.window.location.pathname, '/arcade');
  assert.doesNotMatch(document.body.textContent, /PULL LEVER/);

});

test('changing or clearing authentication also clears private query caches', async () => {
  const { queryClient } = await import('../../client/src/lib/queryClient.ts');
  const { clearToken, setToken } = await import('../../client/src/api/client.ts');
  queryClient.setQueryData(['wallet'], { balance: 123 });
  clearToken();
  assert.equal(queryClient.getQueryData(['wallet']), undefined);
  queryClient.setQueryData(['games', 'history'], { items: ['private-round'] });
  setToken('new-account-token');
  assert.equal(queryClient.getQueryData(['games', 'history']), undefined);
});
