"""Verify cleanup preserves current/previous/used/unrelated images without Docker."""
import json
from pathlib import Path
import runpy
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'prune-images.py'
REPO = 'ghcr.io/vokerg/chess-repertoir-trainer'

class PruneTests(unittest.TestCase):
    def test_only_unused_old_application_images_are_removed(self):
        images=[{'Id':str(i),'Created':str(i),'RepoTags':[REPO+':'+str(i)],'RepoDigests':[]} for i in range(10)]
        images[2]['RepoTags'].append('other-app:stable')
        removed=[]
        def output(args, **kwargs):
            tail=args[1:]
            if tail[:2]==['image','ls']: return ' '.join(str(i) for i in range(10))
            if tail[:3]==['image','inspect','-f']: return '0' if tail[-1].endswith('current') else '1'
            if tail[:2]==['image','inspect']: return json.dumps(images)
            if tail==['ps','-aq']: return 'stopped-container'
            if tail==['inspect','stopped-container']: return json.dumps([{'Image':'3'}])
            raise AssertionError(args)
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            (root/'deployment.env').write_text('IMAGE_REFERENCE='+REPO+'@current\n')
            (root/'previous.env').write_text('IMAGE_REFERENCE='+REPO+'@previous\n')
            with patch('sys.argv',[str(SCRIPT),temp]), patch('subprocess.check_output',side_effect=output), patch('subprocess.run',side_effect=lambda args,**kw: removed.append(args)):
                runpy.run_path(str(SCRIPT),run_name='__main__')
        self.assertEqual({args[-1] for args in removed},{'4','5','6'})
        self.assertTrue(all('--force' not in args for args in removed))

    def test_discovery_failure_never_deletes(self):
        with patch('sys.argv',[str(SCRIPT),'/unused']), patch('subprocess.check_output',side_effect=subprocess.CalledProcessError(1,['docker'])), patch('subprocess.run') as remove:
            with self.assertRaises(subprocess.CalledProcessError):
                runpy.run_path(str(SCRIPT),run_name='__main__')
            remove.assert_not_called()

if __name__=='__main__': unittest.main()
