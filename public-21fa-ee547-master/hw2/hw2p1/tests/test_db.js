'use strict';

const { assert, expect } = require('chai');

const DEFAULT_TIMEOUT_MS = 4e3;
const { Fixture } = require('./fixture_hw2p1');


describe('database file', function() {
  this.timeout(DEFAULT_TIMEOUT_MS);

  const fix = new Fixture();

  // clean-state (each:slow)
  beforeEach(() => fix.before());
  afterEach(() => fix.after());


  it('create if not exist', async () => {
    assert(!fix._db_file_exists());
    const pid = await fix.add_player();
    assert(fix._db_file_exists());
  });

  context('immediate write', () => {
    it('POST /player', async () => {
      const pid = await fix.post_player();

      const { players } = fix._db_load();
      const pids = players.map(({ pid }) => pid);

      expect(pids).to.be.an('array').and.contain(pid);
    });

    it('POST /player/:pid', async () => {
      let lname = 'lname';

      const pid = await fix.add_player({ lname });

      lname = 'lnamep';

      await fix.test_forward(
        Fixture.URL_MAP.UPDATE_PLAYER.method,
        Fixture.URL_MAP.UPDATE_PLAYER.path(pid),
        { lname }, 303);

      const { players } = fix._db_load();
      const record = players.find(({ pid: ppid }) => (ppid === pid));

      expect(record).to.have.property('lname').and.equal(lname);
    });

    it('DELETE /player/:pid', async () => {
      const pid = await fix.add_player();

      await fix.test_forward(
        Fixture.URL_MAP.DELETE_PLAYER.method,
        Fixture.URL_MAP.DELETE_PLAYER.path(pid),
        {}, 303);
      
      const db = fix._db_load();      
      const pids = db.players.map(({ pid }) => pid);
      expect(pids).to.be.an('array').and.not.contain(pid);
    });

    it('POST /deposit/player/:pid', async () => {
      const balance_usd = '1.00';
      const amount_usd = '1.23';

      const pid = await fix.add_player({ balance_usd });

      await fix.test_succeed(
        Fixture.URL_MAP.DEPOSIT_PLAYER.method,
        Fixture.URL_MAP.DEPOSIT_PLAYER.path(pid),
        { amount_usd }, 200);

      const { players } = fix._db_load();
      const record = players.find(({ pid: ppid }) => (ppid === pid));

      const new_balance_usd = fix._add_usd(balance_usd, amount_usd);
      expect(record).to.have.property('balance_usd').and.to.satisfy(val => (val === new_balance_usd || val.toFixed(2) === new_balance_usd))
    });
  });

  context('meta field: version', () => {   
    it('version set', async () => {
      await fix.post_player();

      const db = fix._db_load();

      expect(db).to.have.property('version');
      expect(db.version).to.equal(Fixture.DATABASE_FILE_VERSION);
    });
  });

  context('meta field: createdAt', () => {   
    it('createdAt set', async () => {
      await fix.post_player();

      const db = fix._db_load();

      expect(db).to.have.property('created_at');
      expect(db.created_at).to.be.valid.iso8601;
    });
    
    it('createdAt no change on update', async () => {
      await fix.post_player();
      const { created_at: createdAt1 } = fix._db_load();

      await fix.post_player();
      const { created_at: createdAt2 } = fix._db_load();

      expect(createdAt2).to.equal(createdAt1);
    });
    
    it('createdAt no change on start', async () => {
      await fix.post_player();
      const { created_at: createdAt1 } = fix._db_load();

      await fix.stop();
      await fix.start();

      const { created_at: createdAt2 } = fix._db_load();

      expect(createdAt2).to.equal(createdAt1);
    });
  });

  context('meta field: updatedAt', () => {
    it('updatedAt set', async () => {
      await fix.post_player();

      const db = fix._db_load();

      expect(db).to.have.property('updated_at');
      expect(db.updated_at).to.be.valid.iso8601;
    });
    
    it('updatedAt on change', async () => {
      await fix.post_player();
      const { updated_at: updatedAt1 } = fix._db_load();

      await fix.post_player();
      const { updated_at: updatedAt2 } = fix._db_load();

      expect(updatedAt2).to.not.equal(updatedAt1);
    });
    
    it('updatedAt no change on start', async () => {
      await fix.post_player();
      const { updated_at: updatedAt1 } = fix._db_load();

      await fix.stop();
      await fix.start();

      const { updated_at: updatedAt2 } = fix._db_load();

      expect(updatedAt2).to.equal(updatedAt1);
    });
  });
});
