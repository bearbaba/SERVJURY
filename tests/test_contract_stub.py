"""Offline Python behavioral checks using a GenLayer runtime stub.
NOT a GenVM, not AI consensus, not an on-chain integration test.
"""
import importlib.util
import sys
import types
import unittest

class UserError(Exception): pass
class Return:
    def __init__(self, calldata): self.calldata = calldata
class VM:
    UserError = UserError
    Return = Return
    @staticmethod
    def run_nondet_unsafe(leader, validator):
        value = leader()
        if not validator(Return(value)):
            raise UserError("Independent validator rejected leader")
        return value
class Contract:
    def __init__(self): self.cases = {}
class Nondet:
    calls = 0
    @classmethod
    def exec_prompt(cls, prompt, response_format='json'):
        cls.calls += 1
        if 'Source count: 0' in prompt:
            return {'verdict':'REWORK','reason':'The required sources were not provided.'}
        if 'inaccessible' in prompt:
            return {'verdict':'UNVERIFIABLE','reason':'Evidence cannot be independently inspected.'}
        return {'verdict':'ACCEPT','reason':'The required elements were supplied in the fixture.'}
class Public:
    @staticmethod
    def write(fn): return fn
    @staticmethod
    def view(fn): return fn
fake = types.ModuleType('genlayer')
fake.allow_storage=lambda cls:cls
fake.Contract=Contract
fake.TreeMap=dict
fake.public=Public
fake.vm=VM
fake.nondet=Nondet
fake.message=types.SimpleNamespace(sender_address='0x1234')
sys.modules['genlayer']=fake
spec=importlib.util.spec_from_file_location('servjury_contract','contracts/ServJury.py')
module=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=module
spec.loader.exec_module(module)

class ContractTests(unittest.TestCase):
    def setUp(self):
        self.contract=module.ServJury()
        self.contract.__init__()
        self.contract.cases = {}  # GenVM initializes declared TreeMap storage automatically.
        Nondet.calls=0
    def file(self, identifier='case-1', evidence='Source count: 0'):
        self.contract.file_case(identifier, 'openserv-42', 'Provide three dated URLs','No URLs provided',evidence)
    def test_rework_requires_two_separate_judgements(self):
        self.file()
        self.contract.adjudicate_case('case-1')
        self.assertEqual('REWORK', self.contract.cases['case-1'].verdict)
        self.assertEqual(2, Nondet.calls)
        self.assertEqual('DECIDED', self.contract.cases['case-1'].status)
    def test_filing_immutable(self):
        self.file()
        with self.assertRaisesRegex(UserError,'already exists'):
            self.file()
    def test_no_replay(self):
        self.file(); self.contract.adjudicate_case('case-1')
        with self.assertRaisesRegex(UserError,'already adjudicated'):
            self.contract.adjudicate_case('case-1')
    def test_unknown_or_empty_blocked(self):
        with self.assertRaisesRegex(UserError,'Unknown case'):
            self.contract.adjudicate_case('missing')
        with self.assertRaisesRegex(UserError,'required'):
            self.contract.file_case('a','task','terms','delivery','')
    def test_unverifiable_and_readback(self):
        self.file('case-2','Attachment inaccessible')
        self.contract.adjudicate_case('case-2')
        import json
        read=json.loads(self.contract.get_case('case-2'))
        self.assertEqual('UNVERIFIABLE',read['verdict'])
        self.assertEqual('openserv-42',read['task_id'])

if __name__=='__main__': unittest.main()
