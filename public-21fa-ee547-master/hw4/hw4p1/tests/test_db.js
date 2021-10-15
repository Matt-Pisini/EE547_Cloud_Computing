'use strict';

const { assert, expect } = require('chai');

const DEFAULT_TIMEOUT_MS = 4e3;
const SHORT_TIMEOUT_MS = 1e3;
const { Fixture } = require('./fixture_hw4p1');

const EXIT_CODE = {
  INVALID_JSON:     2,
  CONNECTION_ERROR: 5
};


describe('database config', function() {
  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  // these tests check exit status and will 
  // control program start and db config

  context('syntax', () => {
    it('invalid JSON', async () => {
      fix.write_config(null, 'abc');

      fix.start_sync(SHORT_TIMEOUT_MS, { printOnClose: false });

      expect(fix.ps.killed).to.equal(false, `timeout error -- expected early exit with exitCode:${EXIT_CODE.INVALID_JSON}`);
      expect(fix.ps.exitCode).to.equal(EXIT_CODE.INVALID_JSON);
    });
  });
});


describe('database connection', function() {
  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  // clean-state (each:slow)
  beforeEach(() => fix.before());
  afterEach(() => fix.after());

  context('immediate write', () => {
    it('POST /player', async () => {
      let pids = await fix._player_list();

      const pid = await fix.post_player();
      expect(pids).to.not.contain(pid);

      pids = await fix._player_list();
      expect(pids).to.contain(pid);

      const player = await fix._player_get(pid);
      expect(player).to.exist.and.to.be.a.document('player');
    });

    it('POST /player/:pid', async () => {
      let lname = 'lname';

      const pid = await fix._player_create({ lname });

      lname = 'lnamep';

      await fix.test_forward(
        Fixture.URL_MAP.PLAYER_UPDATE.method,
        Fixture.URL_MAP.PLAYER_UPDATE.path(pid),
        { lname }, 303);

      const player = await fix._player_get(pid);
      expect(player).to.exist.and.to.be.a.document('player');
      expect(player.lname).to.equal(lname);
    });

    it('DELETE /player/:pid', async () => {
      const pid = await fix._player_create();

      let pids = await fix._player_list();
      expect(pids).to.contain(pid);

      await fix.test_forward(
        Fixture.URL_MAP.PLAYER_DELETE.method,
        Fixture.URL_MAP.PLAYER_DELETE.path(pid),
        {}, 303);

      pids = await fix._player_list();
      expect(pids).to.not.contain(pid);
    });

    it('POST /deposit/player/:pid', async () => {
      const balance_usd = '1.00';
      const amount_usd = '1.23';

      const pid = await fix._player_create({ balance_usd });

      await fix.test_succeed(
        Fixture.URL_MAP.PLAYER_DEPOSIT.method,
        Fixture.URL_MAP.PLAYER_DEPOSIT.path(pid),
        { amount_usd }, 200);

      const new_balance_usd = fix._add_usd(balance_usd, amount_usd);
      const player = await fix._player_get(pid);
      expect(player).to.exist.and.to.be.a.document('player');
      expect(player.balance_usd).and.to.satisfy(val => (val === new_balance_usd || val.toFixed(2) === new_balance_usd));
    });
  });
});
