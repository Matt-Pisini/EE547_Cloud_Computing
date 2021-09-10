'use strict';

const { expect } = require('chai');

const DEFAULT_TIMEOUT_MS = 4e3;
const { Fixture } = require('./fixture_hw2p1');

const DEFAULT_PAGE_LENGTH = 4;
const MAXIMUM_PAGE_LENGTH = 25;



describe('GET /ping', function() {
  const DEFAULT_PATH   = '/ping';
  const DEFAULT_METHOD = 'get';

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());

  it('response code is 204', async function () {
    const url = fix.url(DEFAULT_PATH);
    const { body, status } = await fix.request(DEFAULT_METHOD, url);

    expect(status).to.be.equal(204);
    expect(body).to.be.equal('');
  });
});

describe('GET /shuffle', function() {
  const DEFAULT_PATH   = '/shuffle';
  const DEFAULT_METHOD = 'get';

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());

  context('anagram', function () {
    it('empty string', async function () {
      const p = '';
      
      return fix.test_fail(
        DEFAULT_METHOD, DEFAULT_PATH, { p },
        400, ''
      );
    });
    
    it('echo string', async function () {
      const p = fix.random_string(8);
      
      return fix.test_succeed(
        DEFAULT_METHOD, DEFAULT_PATH, { p },
        200, { p }
      );
    });
    
    it.only('count', async function () {
      const ps = [
        fix.random_string(1),
        // fix.random_string(4),
        // fix.random_string(10),
        // fix.random_string(32)
      ];

      return Promise.map(ps, p =>
        fix.test_succeed(
          DEFAULT_METHOD, DEFAULT_PATH, { p },
          200, { total: fix.anagram_count(p) }
        ));
    });  

    it('invalid string', async function () {
      const ps = [
        'space string',
        '.',
        ' ',
        'invalid^'
      ];

      return Promise.map(ps, p => 
        fix.test_fail(
          DEFAULT_METHOD, DEFAULT_PATH, { p },
          400, ''
        ));
    });
  });

  context('page', function () {
    it('is alphabetical', async function () {
      const p = fix.random_string(12);
      const limit = 8;

      const { body } = await fix.test_succeed(
        DEFAULT_METHOD, DEFAULT_PATH, { p, limit }, 200
      );

      let { page } = JSON.parse(body);
      expect(page).to.be.deep.equal(fix.anagram_page(p, limit));
    });

    it('default limit, total < DEFAULT_PAGE_LENGTH', async function () {
      const p = 'ab';

      const { body } = await fix.test_succeed(
        DEFAULT_METHOD, DEFAULT_PATH, { p }, 200
      );

      let { page } = JSON.parse(body);
      expect(page).to.be.deep.equal(fix.anagram_page(p, DEFAULT_PAGE_LENGTH));
    });

    it('default limit', async function () {
      const p = fix.random_string(12);

      const { body } = await fix.test_succeed(
        DEFAULT_METHOD, DEFAULT_PATH, { p }, 200
      );

      let { page } = JSON.parse(body);
      expect(page).to.be.deep.equal(fix.anagram_page(p, DEFAULT_PAGE_LENGTH));
    });
    
    it('require integer', async function () {
      const p = fix.random_string(12);

      const limits = [
        '14.5',
        '14.0',
        'abc',
        '',
        14.1
      ]

      return Promise.map(limits, limit =>
        fix.test_fail(DEFAULT_METHOD, DEFAULT_PATH, { p, limit }, 400));
    });
    
    it('enforce maximum', async function () {
      const p = fix.random_string(12);
      const limit = 26;

      const { body } = await fix.test_succeed(
        DEFAULT_METHOD, DEFAULT_PATH, { p, limit }, 200
      );

      let { page } = JSON.parse(body);
      expect(page).to.be.deep.equal(fix.anagram_page(p, MAXIMUM_PAGE_LENGTH));
    });
  });  
});


describe('GET /status', function() {
  const DEFAULT_PATH   = '/status';
  const DEFAULT_METHOD = 'get';

  const ERROR_PATH = '/dummy';

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());

  it('response code is 204', async function () {
    const url = fix.url(DEFAULT_PATH);
    const { body, status } = await fix.request(DEFAULT_METHOD, url);    

    expect(status).to.be.equal(200);
  });

  it('request count', async function () {
    // "live" pings increment, ignore by getting "init" count
    const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH);
    let { req } = JSON.parse(body);
   
    req += 1;
    await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200, { req });
    
    req += 1;
    await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200, { req });
  });

  it('err increment request count', async function () {
    // "live" pings increment, ignore by getting "init" count
    const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH);
    let { req } = JSON.parse(body);
   
    req += 1;
    await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH);
   
    req += 1;
    await fix.test_fail(DEFAULT_METHOD, ERROR_PATH);
    
    req += 1;
    await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200, { req });
  });

  it('count error', async function () {
    // prev errs increment, ignore by getting "init" count
    const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH);
    let { err } = JSON.parse(body);
   
    await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH);
   
    err += 1;
    await fix.test_fail(DEFAULT_METHOD, ERROR_PATH);
    
    err += 1;
    await fix.test_fail(DEFAULT_METHOD, ERROR_PATH);
    
    await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH, {}, 200, { err });
  });

  it('time is current and UTC', async function () {
    const { body } = await fix.test_succeed(DEFAULT_METHOD, DEFAULT_PATH);
    const { time } = JSON.parse(body);

    expect(time).to.be.valid.iso8601;
  });
});


describe('GET /secret', function() {
  const DEFAULT_PATH   = '/secret';
  const DEFAULT_METHOD = 'get';

  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());

  beforeEach(() => fix.secret_rem());

  it('secret exists', async function () {
    const secret = fix.random_string(8);

    fix.secret_write(secret);

    const url = fix.url(DEFAULT_PATH);
    const { body, status } = await fix.request(DEFAULT_METHOD, url);

    expect(status).to.be.equal(200);
    expect(body).to.be.equal(secret);
  });

  it('secret does not exist', async function () {
    const url = fix.url(DEFAULT_PATH);
    const { body, status } = await fix.request(DEFAULT_METHOD, url);

    expect(status).to.be.equal(404);
    expect(body).to.be.equal('');
  });

  it('secret not cached', async function () {
    const secret = fix.random_string(8);

    fix.secret_write(secret);

    const url = fix.url(DEFAULT_PATH);
    let body, status;

    ({ body, status } = await fix.request(DEFAULT_METHOD, url));

    expect(status).to.be.equal(200);
    expect(body).to.be.equal(secret);

    fix.secret_rem();

    ({ body, status } = await fix.request(DEFAULT_METHOD, url));

    expect(status).to.be.equal(404);
    expect(body).to.be.equal('');

    fix.secret_write(secret);

    ({ body, status } = await fix.request(DEFAULT_METHOD, url));

    expect(status).to.be.equal(200);
    expect(body).to.be.equal(secret);
  });
});


describe('other', function() {
  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  before(() => fix.before());
  after(() => fix.after());

  it('response code 404 GET unknown path', function () {
    const paths = [
      '/',
      '/dummy',
      '/dummy/path'
    ];

    return Promise.map(paths, async path => {
      const url = fix.url(path);
      const { status } = await fix.request('GET', url);

      expect(status).to.be.equal(404);
    });
  });
});
