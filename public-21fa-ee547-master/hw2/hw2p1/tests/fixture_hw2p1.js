'use strict';

const chai = require('chai');
const { expect } = chai;

const { Fixture } = require('../lib/fixture');
const fs = require('fs');
const path = require('path');

const {
  random_string
} = require('../lib/util');

const INTERPRETER = 'node';
const SCRIPT_TO_TEST = `${__dirname}/../hw2p1.js`;

// TEMP
const DATABASE_FILE = `${__dirname}/../data/player.json`
const DATABASE_FILE_VERSION = '1.0';

const URL_MAP = {
  CREATE_PLAYER: {
    method: 'POST',
    path:   '/player'
  },
  DELETE_PLAYER: {
    method: 'DELETE',
    path:   (pid) => `/player/${pid}`
  },
  DEPOSIT_PLAYER: {
    method: 'POST',
    path:   (pid) => `/deposit/player/${pid}`
  },
  GET_PLAYER: {
    method: 'GET',
    path:   (pid) => `/player/${pid}`
  },
  GET_PLAYERS: {
    method: 'GET',
    path:   `/player`
  },
  PING: {
    method: 'GET',
    path:   '/ping'
  },
  UPDATE_PLAYER: {
    method: 'POST',
    path:   (pid) => `/player/${pid}`
  }
};

const WWW = {
  host:  'localhost',
  port:  '3000',
  proto: 'http'
}


const HANDED_MAP = {
  A: 'ambi',
  L: 'left',
  R: 'right'
};

// player defaults
const DEFAULT_FNAME   = random_string();
const DEFAULT_LNAME   = random_string();
const DEFAULT_HANDED  = 'L';
const DEFAULT_INITIAL = '5.66';

// REUSABLE
let url, body, status, headers;


class Hw2P1Fixture extends Fixture {
  constructor() {
    super(INTERPRETER, SCRIPT_TO_TEST);

    this.setWwwOpts(WWW);
  }

  before() {    
    this._db_flush();
    return super.before();
  }


  // ENTITY HELPERS
  
  // return obj, use params and replace missing with DEFAULT
  add_player_param(data) {
    const DEFAULT_DATA = {
      fname:               DEFAULT_FNAME,
      lname:               DEFAULT_LNAME,
      handed:              HANDED_MAP[DEFAULT_HANDED],
      initial_balance_usd: DEFAULT_INITIAL
    }

    return { ...DEFAULT_DATA, ...data };
  }


  // create player by request
  // return pid
  async post_player(params = {}) {
    params = this.add_player_param(params);

    url = this.url(URL_MAP.CREATE_PLAYER.path, params);
    ({ status, headers } = await this.request(URL_MAP.CREATE_PLAYER.method, url));

    expect(status).to.be.equal(303);
    // axios uses lower-case
    expect(headers).to.have.property('location');
    expect(headers['location']).to.match(/^\/player\/(\d+)$/);

    const [, pid] = headers['location'].match(/^\/player\/(\d+)$/);
    return parseInt(pid, 10);
  }
  

  // return obj, use params and replace missing with DEFAULT
  _add_player_defs(data) {
    const DEFAULT_DATA = {
      fname:       DEFAULT_FNAME,
      lname:       DEFAULT_LNAME,
      handed:      DEFAULT_HANDED,
      balance_usd: DEFAULT_INITIAL,
      is_active:   true
    }

    return { ...DEFAULT_DATA, ...data };
  }


  // add player with data (defaults: _add_player_defs)
  // return pid
  async add_player(data = {}) {
    data = this._add_player_defs(data);
    console.log(data);
    
    await this.stop();

    const db = this._db_load();

    if (!('pid' in data)) {      
      data.pid = this._get_free_id(db.players);
    }

    db.players.push(data);
    this._db_save(db);
    
    await this.start();

    return data.pid;
  }


  _db_file_exists() {
    return fs.existsSync(DATABASE_FILE);
  }


  // fetch from player db
  _db_load() {
    if (!this._db_file_exists()) {
      return {
        createdAt:  new Date(),
        modifiedAt: '',
        players:    [],
        version:    DATABASE_FILE_VERSION
      };
    }

    try {
      const data = fs.readFileSync(DATABASE_FILE);
      return JSON.parse(data);
    } catch (err) {
      console.error(`error JSON parsing database file -- file:${DATABASE_FILE}, err:${err}`);
      return {};
    }
  }


  _db_save(data) {
    data.modifiedAt = new Date();

    const dir = path.dirname(DATABASE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    data = JSON.stringify(data);
    fs.writeFileSync(DATABASE_FILE, data);
  }


  _db_flush() {
    if (this._db_file_exists()) {
      fs.unlinkSync(DATABASE_FILE);
    }
  }

  
  _get_free_id(objs = []) {
    //return Math.max(objs.map(({ pid }) => pid)) + 1;
    return parseInt(Math.random() * 1e9);
  }


  _to_currency(val) {
    return parseFloat(val).toFixed(2);
  }


  _add_usd(v1, v2) {
    return this._to_currency(parseFloat(v1) + parseFloat(v2));
  }


  _sub_usd(v1, v2) {
    return this._to_currency(parseFloat(v1) - parseFloat(v2));
  }
}

Hw2P1Fixture.URL_MAP = URL_MAP;
Hw2P1Fixture.DATABASE_FILE_VERSION = DATABASE_FILE_VERSION;

module.exports = {
  Fixture: Hw2P1Fixture
}
