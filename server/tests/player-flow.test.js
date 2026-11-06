import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const requireClient = createRequire(new URL('../../client/package.json', import.meta.url));

test('player can adjust stakes, retry a failed result, replay, and resume without returning to lobby', async (t) => {
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
  axios.defaults.adapter = async (config) => {
    const url = config.url;
    let data;
    if (url === '/api/wallet') data = { wallet: { balance } };
    else if (url === '/api/games/history') data = { items: history };
    else if (url.endsWith('/play')) {
      const { stake } = JSON.parse(config.data);
      stakes.push(stake);
      balance -= stake;
      const session = { id: `round-${++sequence}`, gameId: 'slots', gameName: 'Slot Machine', pointsSpent: stake, status: 'in_progress', score: null };
      history.unshift(session);
      data = { session };
    } else if (url.endsWith('/complete')) {
      if (failComplete) { failComplete = false; throw new Error('Temporary connection failure'); }
      const { score } = JSON.parse(config.data);
      Object.assign(history[0], { status: 'completed', score });
      balance += score;
      data = { session: { ...history[0] } };
    } else throw new Error(`Unexpected request: ${url}`);
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const { default: GameLauncher, useGameLauncher } = await import('../../client/src/components/player/GameLauncher.tsx');
  const game = { id: 'slots', name: 'Slot Machine', pointCost: 0.5 };
  let launcher;
  function Harness() {
    launcher = useGameLauncher([game]);
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
  await act(async () => launcher.finish(1.5));
  await flush();
  assert.match(document.body.textContent, /Retry saving result/);
  assert.equal(launcher.pendingScore, 1.5);
  assert.ok(document.querySelector('[inert]'));
  await act(async () => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Retry saving result').click());
  await flush();
  assert.equal(launcher.result.session.score, 1.5);
  assert.equal(balance, 5.5);
  assert.match(document.body.textContent, /Play again/);
  assert.doesNotMatch(document.body.textContent, /Back to lobby/);
  await typeStake('');
  assert.ok([...document.querySelectorAll('button')].find((b) => b.textContent === 'Play again').disabled);
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
