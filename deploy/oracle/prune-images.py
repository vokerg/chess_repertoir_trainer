#!/usr/bin/env python3
"""Bound only this application's cached images; never force or prune globally."""
import json
from pathlib import Path
import subprocess
import sys

REPOSITORY = 'ghcr.io/vokerg/chess-repertoir-trainer'
root = Path(sys.argv[1])


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


# Do not risk deleting anything if any discovery/inspection fails.
ids = set(docker('image', 'ls', '--no-trunc', '--format', '{{.ID}}', REPOSITORY).split())
if not ids:
    sys.exit(0)
images = json.loads(docker('image', 'inspect', *sorted(ids)))
keep = {image['Id'] for image in sorted(images, key=lambda i: i['Created'], reverse=True)[:3]}
for state in ('deployment.env', 'previous.env'):
    path = root / state
    if path.exists():
        reference = next(line.split('=', 1)[1] for line in path.read_text().splitlines() if line.startswith('IMAGE_REFERENCE='))
        keep.add(docker('image', 'inspect', '-f', '{{.Id}}', reference))
containers = docker('ps', '-aq').split()
if containers:
    keep.update(container['Image'] for container in json.loads(docker('inspect', *containers)))
for image in images:
    # Protect unrelated repositories even if another project tagged this image too.
    references = (image.get('RepoTags') or []) + (image.get('RepoDigests') or [])
    if image['Id'] in keep or not references:
        continue
    if not all(ref.startswith(REPOSITORY + ':') or ref.startswith(REPOSITORY + '@') for ref in references):
        continue
    subprocess.run(['docker', 'image', 'rm', image['Id']], check=False, stdout=subprocess.DEVNULL)
