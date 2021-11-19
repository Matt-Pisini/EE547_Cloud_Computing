'use strict';

const { assert, expect } = require('chai');

const DEFAULT_TIMEOUT_MS = 4e3;
const { Fixture } = require('./fixture_hw5p1');


describe('GET /match', function() {
  const DEFAULT_PATH   = Fixture.URL_MAP.MATCH_LIST.path;
  const DEFAULT_METHOD = Fixture.URL_MAP.MATCH_LIST.method;

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  beforeEach(() => fix._db_flush());

  before(() => fix.before());
  after(() => fix.after());

  
  context('contains 1 match', () => {
    it('response code is 200', async function () {
      await fix._match_create();
      return fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200);
    });

    it('response is array length 1', async function () {
      await fix._match_create();
      const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200);
      
      const d = JSON.parse(body);
      expect(d).to.be.an('array').with.length(1);

      for (const obj of d) {
        expect(obj).to.be.a.model('match');
      }
    });
  });

  
  context('contains 2+ match', () => {
    it('response code is 200', async function () {
      await Promise.all([
        fix._match_create(),
        fix._match_create()
      ]);
      return fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200);
    });

    it('response is array length 2', async function () {
      await Promise.all([
        fix._match_create(),
        fix._match_create()
      ]);
      const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200);
      
      const d = JSON.parse(body);
      expect(d).to.be.an('array').with.length(2);

      for (const obj of d) {
        expect(obj).to.be.a.model('match');
      }
    });
  });
  

  context('sort match', function () {
    it('active, prize_usd_cents DESC', async function () {
      // insert in order
      const vals = [
        600,
        500,
        700,
        100,
        900
      ];
      const sorted_vals = vals.sort().reverse();

      await Promise.map(vals, prize_usd_cents => fix._match_create({ prize_usd_cents }));

      const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200);
      const objs = JSON.parse(body);

      const prize_usds = objs.map(({ prize_usd_cents }) => prize_usd_cents);
      expect(prize_usds).to.deep.equal(sorted_vals);
    });


    it('at most 4 not-active', async function () {
      const EXP_MAX_LENGTH = 4;
      
      // insert in order
      const vals = [
        600,
        500,
        700,
        100,
        900
      ];

      const ids = await Promise.map(vals, prize_usd_cents => fix._match_create({ prize_usd_cents }));
      await Promise.map(ids, async ({ mid, p1_id }) => {
        await fix.post_match_award(mid, p1_id);
        await fix.post_match_end(mid);
      });

      const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200);
      const objs = JSON.parse(body);

      expect(objs).to.have.length(Math.min(EXP_MAX_LENGTH, vals.length));
    });


    it('active before not-active', async function () {      
      // insert in order
      const vals = [
        100,
        600,
        500,
        700
      ];

      const ids = await Promise.map(vals, prize_usd_cents => fix._match_create({ prize_usd_cents }));

      const not_active_ids = [ids[1], ids[2]];
      // const active_mids = [ids[0], ids[3]];
      // active only, indexes match above, manual sort based on vals
      const sorted_active_mids = [ids[3].mid, ids[0].mid];
      const not_active_mids = [ids[1].mid, ids[2].mid];

      await Promise.map(not_active_ids, async ({ mid, p1_id }) => {
        await fix.post_match_award(mid, p1_id);
        await fix.post_match_end(mid);
      });

      const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200);
      const objs = JSON.parse(body);

      const mids = objs.map(({ mid }) => mid);
      expect(mids.slice(0, 2)).to.deep.equal(sorted_active_mids);
      expect(mids.slice(2, 4)).to.deep.members(not_active_mids);
    });
  });
});


describe('GET /match/:mid', function() {
  const DEFAULT_PATH   = Fixture.URL_MAP.MATCH_GET.path;
  const DEFAULT_METHOD = Fixture.URL_MAP.MATCH_GET.method;

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());


  context('mid exist', () => {
    it('response code is 200', async () => {
      const { mid } = await fix._match_create();
      return fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 200);
    });

    it('response is valid match', async () => {
      const { mid } = await fix._match_create();
      const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 200);

      const d = JSON.parse(body);
      expect(d).to.be.a.model('match');
    });
  });


  context('prize_usd_cents', function () {
    it('response contains prize_usd_cents', async function () {
      const { mid } = await fix._match_create();
      return fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 200, ['prize_usd_cents']);
    });

    it('total_prize is currency', async function () {
      const prize_usd_cents = 543;
      const { mid } = await fix._match_create({ prize_usd_cents });
      return fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH(mid), {}, 200, { prize_usd_cents });
    });
  });
});
