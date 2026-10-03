"""A source regression must stop publication, not turn a direct service into a silent detour."""
import json, pathlib, shutil, subprocess, sys, tempfile
root=pathlib.Path(__file__).resolve().parents[1]
for corruption in ['missing_geometry','missing_station','disabled_exception','excessive_exception']:
    with tempfile.TemporaryDirectory() as tmp:
        clone=pathlib.Path(tmp)
        for directory in ['scripts','data-source']:shutil.copytree(root/directory,clone/directory)
        (clone/'public').mkdir()
        if corruption=='missing_geometry':
            path=clone/'data-source/sections.json';rows=json.loads(path.read_text())
            rows=[r for r in rows if not (r['operator']=='東京地下鉄' and r['line']=='3号線銀座線')]
            assert len(rows)<len(json.loads(path.read_text()))
            path.write_text(json.dumps(rows,ensure_ascii=False))
        elif corruption=='missing_station':
            path=clone/'data-source/stations.json';rows=json.loads(path.read_text())
            rows=[r for r in rows if r['name']!='葛西臨海公園']
            path.write_text(json.dumps(rows,ensure_ascii=False))
        else:
            path=clone/'data-source/corridors.json';spec=json.loads(path.read_text())
            spec['geometryBoundaryExceptions'][0]['maxOutsideMetres']=.5 if corruption=='disabled_exception' else 1000
            path.write_text(json.dumps(spec,ensure_ascii=False))
        process=subprocess.run([sys.executable,str(clone/'scripts/build_data.py')],capture_output=True,text=True)
        assert process.returncode!=0 and any(message in process.stderr for message in ['Unexpected coverage exclusions','Unexpected or unused geometry boundary exception','exceeds 60m ceiling']),process.stderr
        assert not (clone/'public/network.json').exists()
        assert not (clone/'public/coverage.json').exists()
print('PASS missing station/geometry and insufficient/excessive boundary allowances fail before publication')
