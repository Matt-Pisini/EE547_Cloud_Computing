import subprocess, string
import pytest

EXEC='python3'
SCRIPT_TO_TEST='./hw1p1.py'

# PROBLEM_ID: STRING
STRINGS_TO_TEST = [
  'string',
  'space string',
  'stringstring',
  'stringstringstring',
  'aaaaaaaaaaaaaaaaaa',
  'foo1bar',
  '',
  'Loremipsumdolorsitametconsecteturadipiscingelitseddoeiusmodtemporincididuntutlaboreetdoloremagnaaliqua',
  '.',
  ' ',
  'invalid^'
]

EXPECT_RETURNCODE = 0


# only supports text stdout/stderr
def run_test_script(args):
  # check args list
  if not isinstance(args, list):
    args = [args]
  run = [EXEC, SCRIPT_TO_TEST] + args

  # start script
  ps = subprocess.Popen(run, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  ps.wait()

  [stdout, stderr] = [x.decode('utf-8').strip() for x in ps.communicate()]
  returncode = int(ps.returncode)

  return (returncode, stdout, stderr)


# r = k!
def factorial(k):
  r = 1
  for i in range(1, k+1):
    r *= i
  return r


def count_anagrams(s):
  # normalize
  s = s.lower()

  # "histogram"
  hist = [0] * 26
  for k, letter in enumerate(string.ascii_lowercase):
    hist[k] = s.count(letter)

  # multinomial log-implementation
  perm1 = factorial(sum(hist))
  # note, long strings need arbitrary precision
  # published first without, so return both and count either correct
  perm2 = perm1

  for count in hist:
    perm1 /= factorial(count)
    perm2 //= factorial(count)

  return [int(perm1), int(perm2)]


def is_valid(s):
  return not s or s.isalpha()


# does not check valid, only anagram count => number / empty
def assert_stdout(s, stdout):
  if not is_valid(s):
    assert stdout == '', f'string "{s}" STDOUT: expected=, actual={stdout}'
  elif len(s) == 0:
    assert stdout == 'empty', f'string "{s}" STDOUT: expected=empty, actual={stdout}'
  else:
    # note, see comment above
    count1, count2 = count_anagrams(s)
    assert stdout == f'{count1}' or stdout == f'{count2}'



def assert_stderr(s, stderr):
  if not is_valid(s):
    assert stderr == 'invalid', f'string "{s}" STDERR: expected=invalid, actual={stderr}'
  else:
    assert stderr == '', f'string "{s}" STDERR: expected=, actual={stderr}'


@pytest.mark.parametrize('s', [s for s in STRINGS_TO_TEST])
def test_string(s):
  returncode, stdout, stderr = run_test_script(s)

  # if return code does not match AND == 1, assume program crashed, return error
  if returncode != EXPECT_RETURNCODE and returncode == 1:
    raise Exception(stderr)

  assert returncode == EXPECT_RETURNCODE, f'string "{s}" returncode:expected={EXPECT_RETURNCODE}, actual={returncode}'
  assert_stderr(s, stderr)
  assert_stdout(s, stdout)
