'use strict';

const { assert, expect } = require('chai');

const DEFAULT_TIMEOUT_MS = 4e3;
const { Fixture } = require('./fixture_hw4p1');

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
      const balance_usd = '10.00';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({balance_usd}),
        fix._player_create({balance_usd})
      ]);

      const ps = fix.post_match_param({ p1_id, p2_id });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303);
    });

    it('response_code 402 insufficient balance', async function () {
      const balance_usd = '1.00';
      const entry_fee_usd = '2.00';
  
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({balance_usd}),
        fix._player_create()
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd });
      return fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, ps, 402);
    });

    it('players in match', async function () {
      const balance_usd = '2.00';
      const entry_fee_usd = '1.00';

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303, { p1_id, p2_id });
    });

    it('entry reduces balance_usd', async function () {  
      const balance_usd = '10.00';
      const entry_fee_usd = '1.50';

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd });
      await fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303);

      return Promise.map([p1_id, p2_id], async pid => {
        const { balance_usd: balance_usd_post } = await fix._player_get(pid);
        expect(balance_usd_post).to.equal(fix._sub_usd(balance_usd, entry_fee_usd));
      });
    });

    it('response_code 404 if player does not exist', async function () {
      const p2_id = fix.random_id();
      const [p1_id] = await Promise.all([
        fix._player_create()
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id });
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, ps, 404);
    });

    it('response_code 409 if player in active match', async function () {
      const balance_usd = '10.00';
      const entry_fee_usd = '1.50';

      const [p1_id, p2_id, p3_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps1 = fix.post_match_param({ entry_fee_usd, p1_id, p2_id });
      await fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps1, 303);

      const ps2 = fix.post_match_param({ entry_fee_usd, p1_id, p2_id: p3_id });
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, ps2, 409);
    });
  });


  context('prize_usd', function () {
    it('set if valid, two precision digit', async () => {
      const balance_usd = '2.00';
      const entry_fee_usd = '1.00';

      const prize_usd = '10.13';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ entry_fee_usd, p1_id, p2_id, prize_usd });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303, { prize_usd: fix._add_usd(prize_usd, 0) });
    });


    it('set if valid, one precision digit', async () => {
      const balance_usd = '2.00';
      const entry_fee_usd = '1.00';

      const prize_usd = '10.1';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ entry_fee_usd, p1_id, p2_id, prize_usd });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303, { prize_usd: fix._add_usd(prize_usd, 0) });
    });


    it('set if valid, zero precision digit with decimal', async () => {
      const balance_usd = '2.00';
      const entry_fee_usd = '1.00';

      const prize_usd = '10.';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ entry_fee_usd, p1_id, p2_id, prize_usd });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303, { prize_usd: fix._add_usd(prize_usd, 0) });
    });


    it('set if valid, zero precision digit', async () => {
      const balance_usd = '2.00';
      const entry_fee_usd = '1.00';

      const prize_usd = '10';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ entry_fee_usd, p1_id, p2_id, prize_usd });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303, { prize_usd: fix._add_usd(prize_usd, 0) });
    });


    it('fail if invalid', async () => {
      const prize_usd = '10.131';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create(),
        fix._player_create()
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, prize_usd });
      return fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, ps, 400);
    });
  });


  context('entry_fee_usd', function () {
    // NOTE: entry fee not in response

    it('set if valid, two precision digit', async () => {
      const entry_fee_usd = '10.13';
      const balance_usd = '20.00';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303);
    });


    it('set if valid, one precision digit', async () => {
      const entry_fee_usd = '10.1';
      const balance_usd = '20.00';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303);
    });


    it('set if valid, zero precision digit with decimal', async () => {
      const entry_fee_usd = '10.';
      const balance_usd = '20.00';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303);
    });


    it('set if valid, zero precision digit', async () => {
      const entry_fee_usd = '10';
      const balance_usd = '20.00';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd });
      return fix.test_forward(DEFAULT_METHOD, DEFAULT_PATH, ps, 303);
    });


    it('fail if invalid', async () => {
      const entry_fee_usd = '10.131';
      const balance_usd = '20.00';
      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);
      const ps = fix.post_match_param({ p1_id, p2_id, entry_fee_usd });
      return fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, ps, 400);
    });
  });
});


describe('POST /match/:mid/award/:pid', function() {
  const DEFAULT_PATH   = Fixture.URL_MAP.MATCH_AWARD.path;
  const DEFAULT_METHOD = Fixture.URL_MAP.MATCH_AWARD.method;

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());

  context('active match, active player, valid points', function () {
    it('response code is 200', async function () {
      const { mid, p1_id } = await fix._match_create();
      const award_points = 1;
      return fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points: award_points }, 200);
    });

    it('responds with correct match', async function () {
      const { mid, p1_id } = await fix._match_create();
      const award_points = 1;
      return fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points: award_points }, 200, { mid });
    });

    it('response is match model', async function () {
      const { mid, p1_id } = await fix._match_create();
      const award_points = 1;
      const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points: award_points }, 200);
      
      const d = JSON.parse(body);
      expect(d).to.be.a.model('match');
    });

    it('increment from zero points', async function () {
      const { mid, p1_id } = await fix._match_create();
      const award_points = 1;
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points: award_points }, 200, { p1_points: award_points });
    });

    it('award points > 1', async function () {
      const { mid, p1_id } = await fix._match_create();
      const award_points = 2;
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points: award_points }, 200, { p1_points: award_points });
    });

    it('increment from non-zero points', async function () {
      const { mid, p1_id } = await fix._match_create();

      const initial_points = 1;
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points: initial_points }, 200);
      
      const award_points = 1;
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points: award_points }, 200, { p1_points: initial_points + award_points });
    });

    it('sequential calls', async function () {
      // repeat times
      // uses 1, 2, 3, ...
      const length = 4;

      const { mid, p1_id } = await fix._match_create();

      let total_points = 0;
      for (const n of new Array(length).keys()) {
        const award_points = n+1;
        total_points += award_points;
        await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points: award_points }, 200, { p1_points: total_points });
      }
    });

    it('increment player2 points', async function () {
      const { mid, p2_id } = await fix._match_create();
      const award_points = 1;
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p2_id), { points: award_points }, 200, { p2_points: award_points });
    });

    it('increment both points', async function () {
      const { mid, p1_id, p2_id } = await fix._match_create();
      const award_points = 1;
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points: award_points }, 200, { p1_points: award_points, p2_points: 0 });
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p2_id), { points: award_points }, 200, { p1_points: award_points, p2_points: award_points });
    });
  });


  context('invalid points', function () {
    it('points must be (strictly) positive', async function () {
      const test_vals = ['-1', '0'];

      const { mid, p1_id } = await fix._match_create();

      return Promise.map(test_vals, async points => {
        await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points }, 400);
      });
    });

    it('empty points', async function () {
      const points = '';
      const { mid, p1_id } = await fix._match_create();
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points }, 400);
    });

    it('points must be an integer', async function () {
      const points = '1.0';
      const { mid, p1_id } = await fix._match_create();
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points }, 400);
    });

    it('invalid points', async function () {
      const points = 'one';
      const { mid, p1_id } = await fix._match_create();
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points }, 400);
    });
  });


  context('invalid player', function () {
    it('player does not exist', async function () {
      const points = '1';
      const pid = '999';
      const { mid } = await fix._match_create();      
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, pid), { points }, 404);
    });

    it('player is not in match', async function () {
      const points = '1';
      const [{ mid }, pid] = await Promise.all([
        fix._match_create(),
        fix._player_create()
      ]);
      
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, pid), { points }, 400);
    });
  });


  context('invalid match', function () {
    it('match does not exist', async function () {
      const points = '1';
      const mid = '999';
      const { p1_id } = await fix._match_create();
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points }, 404);
    });

    it('match is not active', async function () {
      const points = 1;
      const { mid, p1_id } = await fix._match_create();
      await fix.post_match_award(mid, p1_id);
      await fix.post_match_end(mid);
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), { points }, 409);
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

    it('responds with correct match', async function () {
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

    it('sets ended_at', async function () {
      const { mid, p1_id } = await fix._match_create();
      await fix.post_match_award(mid, p1_id);   
      
      const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 200, { mid });      
      const d = JSON.parse(body);

      expect(d).to.have.property('ended_at');
      expect(d['ended_at']).to.be.iso8601;
    });

    it('award prize to win player', async function () {
      const balance_usd = '10.00';
      const entry_fee_usd = '2.50';
      const prize_usd = '4.00'

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);

      const mid = await fix.post_match({ p1_id, p2_id, entry_fee_usd, prize_usd });
      await fix.post_match_award(mid, p1_id);
      await fix.post_match_end(mid);

      const exp_balance_usd = fix._add_usd(fix._sub_usd(balance_usd, entry_fee_usd), prize_usd);

      const { balance_usd: balance_usd_post } = await fix._player_get(p1_id);
      expect(balance_usd_post).to.be.equal(exp_balance_usd);
    });

    it('no prize to lose player', async function () {
      const balance_usd = '10.00';
      const entry_fee_usd = '2.50';
      const prize_usd = '4.00';

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({ balance_usd }),
        fix._player_create({ balance_usd })
      ]);

      const mid = await fix.post_match({ p1_id, p2_id, entry_fee_usd, prize_usd });
      await fix.post_match_award(mid, p1_id);
      await fix.post_match_end(mid);

      const exp_balance_usd = fix._sub_usd(balance_usd, entry_fee_usd);

      const { balance_usd: balance_usd_post } = await fix._player_get(p2_id);
      expect(balance_usd_post).to.be.equal(exp_balance_usd);
    });
  });


  context('not active match', function () {
    it('match is not active', async function() {
      const { mid, p1_id } = await fix._match_create();
      await fix.post_match_award(mid, p1_id);
      await fix.post_match_end(mid);

      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 409);
    });


    it('match does not exist', async function() {
      const mid = '999';
      await fix._match_create();
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 404);
    });


    it('cannot end tied (at zero) match', async function() {
      const { mid } = await fix._match_create();
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 409);
    });


    it('cannot end tied (at non-zero) match', async function() {
      const points = 4;

      const { mid, p1_id, p2_id } = await fix._match_create();
      await fix.post_match_award(mid, p1_id, points);
      await fix.post_match_award(mid, p2_id, points);
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 409);
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

    it('responds with correct match', async function () {
      const { mid, p1_id } = await fix._match_create();
      await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), {}, 200, { mid });
    });

    it('response is match model', async function () {
      const { mid, p1_id } = await fix._match_create();
      const {body} = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), {}, 200, { mid });
      const d = JSON.parse(body);
      expect(d).to.be.a.model('match');
    });

    it('sets ended_at', async function () {
      const { mid, p1_id } = await fix._match_create();      
      const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), {}, 200, { mid });      
      const d = JSON.parse(body);

      expect(d).to.have.property('ended_at');
      expect(d['ended_at']).to.be.iso8601;
    });

    it('award prize to win player', async function () {
      const balance_usd = '10.00';
      const entry_fee_usd = '2.50';
      const prize_usd = '4.00'

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({balance_usd}),
        fix._player_create({balance_usd})
      ]);

      const mid = await fix.post_match({p1_id, p2_id, entry_fee_usd, prize_usd});
      await fix.post_match_dq(mid, p1_id);

      const exp_balance_usd = fix._add_usd(fix._sub_usd(balance_usd, entry_fee_usd), prize_usd);

      const { balance_usd: balance_usd_post } = await fix._player_get(p2_id);
      expect(balance_usd_post).to.be.equal(exp_balance_usd);
    });

    it('no prize to lose player', async function () {
      const balance_usd = '10.00';
      const entry_fee_usd = '2.50';
      const prize_usd = '4.00';

      const [p1_id, p2_id] = await Promise.all([
        fix._player_create({balance_usd}),
        fix._player_create({balance_usd})
      ]);

      const mid = await fix.post_match({p1_id, p2_id, entry_fee_usd, prize_usd});
      await fix.post_match_dq(mid, p1_id);

      const exp_balance_usd = fix._sub_usd(balance_usd, entry_fee_usd);

      const { balance_usd: balance_usd_post } = await fix._player_get(p1_id);
      expect(balance_usd_post).to.be.equal(exp_balance_usd);
    });
  });


  context('not active match', function () {
    it('match is not active', async function() {
      const { mid, p1_id } = await fix._match_create();
      await fix.post_match_award(mid, p1_id);
      await fix.post_match_end(mid);

      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), {}, 409);
    });


    it('match does not exist', async function() {
      const mid = '999';
      const { p1_id } = await fix._match_create();
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, p1_id), {}, 404);
    });
  });


  context('invalid player', function () {
    it('player does not exist', async function () {
      const pid = '999';
      const { mid } = await fix._match_create();      
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, pid), {}, 404);
    });

    it('player is not in match', async function () {
      const [{ mid }, pid] = await Promise.all([
        fix._match_create(),
        fix._player_create()
      ]);
      
      await fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH(mid, pid), {}, 400);
    });
  });
});

