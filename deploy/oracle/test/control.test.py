"""Orchestration regression tests with a fake Docker CLI; no production access."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[1]
REPO = SOURCE.parents[1]
FAKE = '''#!/usr/bin/env python3
import json, os, pathlib, sys, stat, shutil
args=sys.argv[1:]
name=pathlib.Path(sys.argv[0]).name
with open(os.environ['CALLS'], 'a') as f: f.write(json.dumps([name]+args)+'\\n')
if name=='stat': print(oct(pathlib.Path(args[-1]).stat().st_mode & 0o777)[2:])
elif name in ('sleep','flock','curl'): pass
elif name=='mv': os.replace(args[-2],args[-1])
elif name=='docker':
 if args[0]=='pull' and os.getenv('FAIL_PULL'): sys.exit(1)
 if args[:2]==['image','inspect']: print('arm64')
 elif args[0]=='inspect':
  fmt=args[2]
  print({'{{.State.Running}}':'true','{{.RestartCount}}:{{.State.StartedAt}}':'0:now','{{.State.Running}}:{{.RestartCount}}:{{.State.StartedAt}}':'true:0:now'}[fmt])
 elif args[0]=='logs': print('Persistent job worker started\\nAccount import worker started')
 elif args[0]=='compose':
  if 'ps' in args and '-q' in args: print(args[-1]+'-id')
  if 'exec' in args and os.getenv('FAIL_DB'): sys.exit(1)
'''

class ControlTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.root = self.base / 'app'
        self.root.mkdir()
        (self.root / 'stack.env').write_text('NODE_ENV=production\n')
        (self.root / 'stack.env').chmod(0o600)
        self.bundle = self.base / 'bundle'
        self.bundle.mkdir()
        for src, dst in [(SOURCE/'control.sh','control.sh'), (SOURCE/'prune-images.py','prune-images.py'), (SOURCE/'compose.yml','oracle.yml'), (REPO/'deploy/docker/compose.yml','compose.yml')]:
            shutil.copy(src, self.bundle / dst)
        self.bin = self.base / 'bin'
        self.bin.mkdir()
        for name in ('docker', 'stat', 'flock', 'sleep', 'curl', 'mv'):
            p=self.bin/name
            p.write_text(FAKE)
            p.chmod(0o700)
        self.calls = self.base/'calls'
        self.env = dict(os.environ, PATH=str(self.bin)+':'+os.environ['PATH'], ORACLE_DEPLOY_DIR=str(self.root), CALLS=str(self.calls))
        self.sha='a'*40
        self.digest='sha256:'+'b'*64

    def run_control(self, op, service='all', **env):
        return subprocess.run(['bash',str(self.bundle/'control.sh'),op,service,self.sha,self.digest],env=dict(self.env,**env),capture_output=True,text=True)

    def commands(self):
        return [json.loads(line) for line in self.calls.read_text().splitlines()]

    def deploy(self):
        result=self.run_control('deploy')
        self.assertEqual(result.returncode,0,result.stderr)
        self.calls.write_text('')

    def test_deploy_pins_digest_and_persists_release(self):
        self.deploy()
        self.assertIn('@'+self.digest,(self.root/'deployment.env').read_text())
        self.assertEqual((self.root/'current').resolve(),(self.root/'releases'/self.sha).resolve())
        self.assertIn(self.sha,(self.root/'history.log').read_text())

    def test_stop_worker_does_not_stop_other_services(self):
        self.deploy()
        result=self.run_control('stop','worker')
        self.assertEqual(result.returncode,0,result.stderr)
        stop=[x for x in self.commands() if 'stop' in x]
        self.assertEqual(len(stop),1)
        self.assertEqual(stop[0][-2:],['stop','worker'])
        self.assertFalse(any('up' in x for x in self.commands()))

    def test_start_web_includes_api_but_not_worker(self):
        self.deploy()
        result=self.run_control('start','web')
        self.assertEqual(result.returncode,0,result.stderr)
        up=[x for x in self.commands() if 'up' in x]
        self.assertEqual(up[0][-2:],['api','web'])
        self.assertNotIn('worker',up[0])
        self.assertFalse(any('pull' in x for x in self.commands()))

    def test_failed_pull_does_not_stop_running_stack(self):
        self.deploy()
        before=(self.root/'deployment.env').read_text()
        result=self.run_control('rollback',FAIL_PULL='1')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(before,(self.root/'deployment.env').read_text())
        self.assertFalse(any('stop' in x for x in self.commands()))

    def test_failed_database_probe_reports_failure(self):
        result=self.run_control('deploy',FAIL_DB='1')
        self.assertNotEqual(result.returncode,0)
        self.assertNotIn('result=success',result.stdout)
        self.assertFalse((self.root/'history.log').exists())
        self.assertTrue((self.root/'deployment.env').exists())

    def test_invalid_image_is_rejected_before_docker(self):
        self.sha='invalid'
        self.assertNotEqual(self.run_control('deploy').returncode,0)
        self.assertFalse(any(x[0]=='docker' for x in self.commands()))

    def test_unprotected_environment_is_rejected(self):
        (self.root/'stack.env').chmod(0o644)
        self.assertNotEqual(self.run_control('deploy').returncode,0)

if __name__=='__main__': unittest.main()
