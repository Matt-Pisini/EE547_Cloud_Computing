'use strict';

const { assert, expect } = require('chai');

const DEFAULT_TIMEOUT_MS = 4e3;
const { Fixture } = require('./fixture_hw5p1');

// TODO: on add_match, auto_create new players

describe('POST /match', function() {
  const DEFAULT_PATH   = Fixture.URL_MAP.MATCH_CREATE.path;
  const DEFAULT_METHOD = Fixture.URL_MAP.MATCH_CREATE.method;

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());


  context('active players', function () {
    it('response_code is 303 on success', async () => {
      const balance_usd_cents = 1000;
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd_cents }),
        fix._player_create({ balance_usd_cents })
      ]);

      const ps = fix.post_match_param({ p1_id, p2_id });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303);
    });

    it('response_code 402 insufficient balance', async function () {
      const balance_usd_cents = 100;
      const entry_fee_usd_cents = 200;
  
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd_cents }),
        fix._player_create()
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd_cents });
      return fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, ps, 402);
    });

    it('entry reduces balance_usd_cents', async function () {  
      const balance_usd_cents = 1000;
      const entry_fee_usd_cents = 150;

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd_cents }),
        fix._player_create({ balance_usd_cents })
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd_cents });
      await fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303);

      return Promise.map([p1_id, p2_id], async pid => {
        const { balance_usd_cents: balance_usd_cents_post } = await fix._player_get(pid);
        expect(balance_usd_cents_post).to.equal(balance_usd_cents - entry_fee_usd_cents);
      });
    });
  });


  context('prize_usd_cents', function () {
    it('set if valid, integer digit', async () => {
      const balance_usd_cents = 200;
      const entry_fee_usd_cents = 100;

      const prize_usd_cents = 1000;
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd_cents }),
        fix._player_create({ balance_usd_cents })
      ]);
      const ps = fix.post_match_param({ entry_fee_usd_cents, p1_id, p2_id, prize_usd_cents });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303, { prize_usd_cents: prize_usd_cents });
    });


    it('fail if invalid', async () => {
      const test_vals = [
        -1000,
        100.1
      ];

      return Promise.map(test_vals, async val => {
        const [p1_id, p2_id] = await Promise.all([
          fix._player_create(),
          fix._player_create()
        ]);

        const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd_cents: val });
        return fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, ps, 400);
      });
    });


    const balance_usd_cents = 2000;
    const test_vals = [
      -1000,
      100.1
    ];

    return Promise.map(test_vals, async val => {
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create(),
        fix._player_create({ balance_usd_cents })
      ]);

      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd_cents: val });
      return fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, ps, 400);
    });
  });


  context('entry_fee_usd_cents', function () {
    it('set if valid, integer digit', async () => {
      const entry_fee_usd_cents = 1000;
      const balance_usd_cents = 2000;
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd_cents }),
        fix._player_create({ balance_usd_cents })
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd_cents });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303);
    });


    it('fail if invalid', async () => {
      const balance_usd_cents = 2000;
      const test_vals = [
        -1000,
        100.1
      ];

      return Promise.map(test_vals, async val => {
        const [p1_id, p2_id] = await Promise.all([
          fix._player_create(),
          fix._player_create()
        ]);

        const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd_cents: val });
        return fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, ps, 400);
      });
    });
  });
});


describe('POST /match/:mid/end', function() {
  const DEFAULT_PATH   = Fixture.URL_MAP.MATCH_END.path;
  const DEFAULT_METHOD = Fixture.URL_MAP.MATCH_END.method;

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());


  context('active match, active player', function () {
    it('response code is 200', async function () {
      const { mid, p1_id } = await fix._match_create();
      await fix.post_match_award(mid, p1_id);
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 200, { mid });
    });

    it('response is match model', async function () {
      const { mid, p1_id } = await fix._match_create();
      await fix.post_match_award(mid, p1_id);   
      const {body} = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 200, { mid });
      const d = JSON.parse(body);
      expect(d).to.be.a.model('match');
    });

    it('award prize to win player', async function () {
      const balance_usd_cents = 1000;
      const entry_fee_usd_cents = 250;
      const prize_usd_cents = 400;

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd_cents }),
        fix._player_create({ balance_usd_cents })
      ]);

      const mid = await fix.post_match({ p1_id, p2_id, entry_fee_usd_cents, prize_usd_cents });
      await fix.post_match_award(mid, p1_id);
      await fix.post_match_end(mid);

      const exp_balance_usd_cents = (balance_usd_cents - entry_fee_usd_cents) + prize_usd_cents;

      const { balance_usd_cents: balance_usd_cents_post } = await fix._player_get(p1_id);
      expect(balance_usd_cents_post).to.be.equal(exp_balance_usd_cents);
    });

    it('no prize to lose player', async function () {
      const balance_usd_cents = 1000;
      const entry_fee_usd_cents = 250;
      const prize_usd_cents = 400;

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd_cents }),
        fix._player_create({ balance_usd_cents })
      ]);

      const mid = await fix.post_match({ p1_id, p2_id, entry_fee_usd_cents, prize_usd_cents });
      await fix.post_match_award(mid, p1_id);
      await fix.post_match_end(mid);

      const exp_balance_usd_cents = balance_usd_cents - entry_fee_usd_cents;

      const { balance_usd_cents: balance_usd_cents_post } = await fix._player_get(p2_id);
      expect(balance_usd_cents_post).to.be.equal(exp_balance_usd_cents);
    });
  });
});


describe('POST /match/:mid/disqualify/:pid', function() {
  const DEFAULT_PATH   = Fixture.URL_MAP.MATCH_DQ.path;
  const DEFAULT_METHOD = Fixture.URL_MAP.MATCH_DQ.method;

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());


  context('active match, active player', function () {
    it('response code is 200', async function () {
      const { mid, p1_id } = await fix._match_create();
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), {}, 200, { mid });
    });

    it('response is match model', async function () {
      const { mid, p1_id } = await fix._match_create();
      const {body} = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), {}, 200, { mid });
      const d = JSON.parse(body);
      expect(d).to.be.a.model('match');
    });

    it('award prize to win player', async function () {
      const balance_usd_cents = 1000;
      const entry_fee_usd_cents = 250;
      const prize_usd_cents = 400;

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({balance_usd_cents}),
        fix._player_create({balance_usd_cents})
      ]);

      const mid = await fix.post_match({p1_id, p2_id, entry_fee_usd_cents, prize_usd_cents});
      await fix.post_match_dq(mid, p1_id);

      const exp_balance_usd_cents = (balance_usd_cents - entry_fee_usd_cents) + prize_usd_cents;

      const { balance_usd_cents: balance_usd_cents_post } = await fix._player_get(p2_id);
      expect(balance_usd_cents_post).to.be.equal(exp_balance_usd_cents);
    });

    it('no prize to lose player', async function () {
      const balance_usd_cents = 1000;
      const entry_fee_usd_cents = 250;
      const prize_usd_cents = 400;

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({balance_usd_cents}),
        fix._player_create({balance_usd_cents})
      ]);

      const mid = await fix.post_match({p1_id, p2_id, entry_fee_usd_cents, prize_usd_cents});
      await fix.post_match_dq(mid, p1_id);

      const exp_balance_usd_cents = balance_usd_cents - entry_fee_usd_cents;

      const { balance_usd_cents: balance_usd_cents_post } = await fix._player_get(p1_id);
      expect(balance_usd_cents_post).to.be.equal(exp_balance_usd_cents);
    });
  });
});

