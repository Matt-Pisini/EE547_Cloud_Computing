'use strict';

const { Fixture } = require('../lib/fixture');
const fs = require('fs');
const math = require('mathjs');
const { Permutation } = require('js-combinatorics');

const {
  random_string
} = require('../lib/util');
const { random, sec } = require('mathjs');

const SECRET_FILE = '/tmp/secret.key';
const DEFAULT_SECRET_KEY = random_string(12);


class Hw1P2Fixture extends Fixture {
  random_string(length, mixCase = false) {
    return random_string(length, mixCase);
  }

  anagram_count(str) {
    const l_counts = {};
    for (const l of str) {
      if (!(l in l_counts)) {
        l_counts[l] = 0;
      }
      l_counts[l] += 1;
    }

    // convert to bignum
    for (const k in l_counts) {
      l_counts[k] = math.bignumber(l_counts[k])
    }

    return math.multinomial(Object.values(l_counts)).toFixed();
  }

  anagram_page(str, limit) {
    // algorithm, start with char sorted string
    // then take letters from end until anagram_count >= limit
    // use generator to create page to limit (or end of generator)
    // form page: sort list, and keep max(limit,len)

    // reverse sorted string
    const sortedStr = str.split('').sort().join('');

    let idx;
    for (idx = 1; idx < sortedStr.length; idx += 1) {
      if(this.anagram_count(sortedStr.slice(-idx)) >= limit) {
        break;
      }
    }
    
    // get combinations
    let it = Permutation.of(sortedStr.slice(-idx));
    // console.error(sortedStr.slice(0, -idx), sortedStr.slice(-idx));

    let anagramSet = new Set();
    for (const c of it) {
      anagramSet.add(sortedStr.slice(0, -idx) + c.join(''));

      if (anagramSet.size >= limit) {
        break;
      }
    }

    return Array.from(anagramSet).sort();
  }

  secret_write(secret) {
    fs.writeFileSync(SECRET_FILE, secret);
  }

  secret_rem() {
    if (fs.existsSync(SECRET_FILE)) {
      fs.unlinkSync(SECRET_FILE);
    }
  }
}


module.exports = {
  Fixture: Hw1P2Fixture
}
