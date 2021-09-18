import boto3, csv
import pytest

CSV_TO_TEST='./new_user_credentials.csv'

AWS_USER='ee547-grader-user'
AWS_POLICY='ee547-grader-policy'

# cache here
account_id = None
session = None

def _get_session(csvfile):
  global session

  if session is not None:
    return session

  with open(csvfile, 'r') as csvfile:
    reader = csv.DictReader(csvfile)

    rows = list(reader)
    if len(rows) == 0:
      pytest.fail('CSV contains no data rows')
    if len(rows) > 1:
      pytest.fail('CSV should contain a single row')

    row = rows.pop()
    assert row['User name'] == 'ee547-grader-user', f'username error, expected={AWS_USER}, actual={row["User name"]}'

    access_key_id = row['Access key ID']
    access_secret = row['Secret access key']

    session = boto3.session.Session(aws_access_key_id=access_key_id, aws_secret_access_key=access_secret)

    return session


def _get_account():
  global account_id

  if account_id is not None:
    return account_id

  session = _get_session(CSV_TO_TEST)
  sts = session.client('sts')

  r = sts.get_caller_identity()
  account_id = r['Account']

  return account_id


def test_sts():
  session = _get_session(CSV_TO_TEST)
  sts = session.client('sts')

  r = sts.get_caller_identity()

  assert len(r['Account']) > 0, f'aws::sts.get_caller_identity did not return Account, check your credential'


def test_iam_user():
  session = _get_session(CSV_TO_TEST)
  iam = session.client('iam')

  r = iam.get_user(UserName=AWS_USER)
  r = iam.list_attached_user_policies(UserName=AWS_USER)


def test_iam_attachment():
  session = _get_session(CSV_TO_TEST)
  iam = session.client('iam')

  account_id = _get_account()
  policy_arn = f'arn:aws:iam::{account_id}:policy/{AWS_POLICY}'
  user_arn = f'arn:aws:iam::{account_id}:user/{AWS_USER}'
  
  r = iam.list_attached_user_policies(UserName=AWS_USER)
  policies = r['AttachedPolicies']

  found_match = False
  for policy in policies:
    if policy['PolicyArn'] == policy_arn:
      found_match = True

  if not found_match:
    raise Exception(f'policy not attached to user -- policy_arn:{policy_arn}, user_arn:{user_arn}')


def test_iam_policy():
  session = _get_session(CSV_TO_TEST)
  iam = session.client('iam')

  account_id = _get_account()
  policy_arn = f'arn:aws:iam::{account_id}:policy/{AWS_POLICY}'
  user_arn = f'arn:aws:iam::{account_id}:user/{AWS_USER}'

  r = iam.get_policy(PolicyArn=policy_arn)
  policyVersionId = r['Policy']['DefaultVersionId']

  r = iam.get_policy_version(PolicyArn=policy_arn, VersionId=policyVersionId)
  doc = r['PolicyVersion']['Document']['Statement']
  
  # policy document has three defintions
  assert len(doc) == 3, 'policy document statement length mismatch, expect=3, actual={len(doc)}'

  # RESOURCE: ACCOUNT (STS)

  found_match = False
  for state in doc:
    # should be '*' 
    if 'Resource' not in state:
      continue

    # test for string
    if state['Action'] == 'sts:GetCallerIdentity':
      found_match = True
      break

    # test for array
    if len(state['Action']) == 1 and state['Action'][0] == 'sts:GetCallerIdentity':
      found_match = True
      break

  if not found_match:
    raise Exception(f'no access statement for sts account -- policy_arn:{policy_arn}')



  # RESOURCE: USER

  found_match = False
  for state in doc:
    if 'Resource' not in state:
      continue

    if state['Resource'] == user_arn:
      found_match = True

      # action should contain two perms
      assert 'iam:GetUser' in state['Action'], f'policy document {policy_arn} missing permission -- action:iam:GetUser'
      assert 'iam:ListAttachedUserPolicies' in state['Action'], f'policy document {policy_arn} missing permission -- action:iam:ListAttachedUserPolicies'

      break

  if not found_match:
    raise Exception(f'no policy statement for user resource -- policy_arn:{policy_arn}, user_arn:{user_arn}')


  # RESOURCE: POLICY

  found_match = False
  for state in doc:
    if 'Resource' not in state:
      continue

    if state['Resource'] == policy_arn:
      found_match = True

      # action should contain two perms
      assert 'iam:GetPolicy' in state['Action'], f'policy document {policy_arn} missing permission -- action:iam:GetPolicy'
      assert 'iam:GetPolicyVersion' in state['Action'], f'policy document {policy_arn} missing permission -- action:iam:GetPolicyVersion'

      break

  if not found_match:
    raise Exception(f'no policy statement for policy resource -- policy_arn:{policy_arn}, user_arn:{user_arn}')




def test_csv():
  with open(CSV_TO_TEST, 'r') as csvfile:
    reader = csv.DictReader(csvfile)

    rows = list(reader)
    if len(rows) == 0:
      pytest.fail('CSV contains no data rows')
    if len(rows) > 1:
      pytest.fail('CSV should contain a single row')

    row = rows.pop()
    assert row['User name'] == 'ee547-grader-user', f'username error, expected={AWS_USER}, actual={row["User name"]}'
