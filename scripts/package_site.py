"""Generate local data and package the static site, using only Python's stdlib."""
import argparse
import pathlib
import subprocess
import sys
import tarfile

root = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=pathlib.Path)
archive = parser.parse_args().archive.resolve()
if root / 'public' in archive.parents:
    parser.error('Write the archive outside public/.')
for script in ['build_data.py', 'build_basemap.py']:
    subprocess.run([sys.executable, str(root / 'scripts' / script)], check=True)
files = sorted(p for p in (root / 'public').rglob('*') if p.is_file())
manifest = root / '.openai/hosting.json'
if manifest.is_file():
    files.append(manifest)
# Sites accepts out/ in its archive; the hand-written source stays in public/.
prefix = pathlib.Path('out' if manifest.is_file() else 'public')
with tarfile.open(archive, 'w:gz') as output:
    for path in files:
        name = prefix / path.relative_to(root / 'public') if path.is_relative_to(root / 'public') else path.relative_to(root)
        output.add(path, arcname=name, recursive=False)
print(f'Packaged {len(files)} files: {archive}')
