#!/usr/bin/env python3
"""Build the curated heart-sound clip library used by the /signs drill.

Downloads a small, deterministic subset of REAL recordings from two open PhysioNet
datasets, both released under the Open Data Commons Attribution License v1.0
(commercial use permitted with attribution):

  * PhysioNet/Computing in Cardiology Challenge 2016, training-c (adult patients with
    aortic stenosis, mitral regurgitation, and controls).
    https://physionet.org/content/challenge-2016/1.0.0/
  * The CirCor DigiScope Phonocardiogram Dataset v1.0.3 (paediatric, with expert
    murmur annotations).  https://physionet.org/content/circor-heart-sound/1.0.3/

The ICBHI respiratory database is deliberately NOT used (research-only licence).

Each clip is trimmed (skip the first 2 s of handling noise, keep up to 12 s), band
limited, loudness normalised and encoded as mono MP3. Labels are copied ONLY from the
dataset metadata; nothing is inferred. Output:

  apps/web/public/signs/audio/<id>.mp3
  packages/shared/src/signs/manifest.json

Requirements: python3 (stdlib only) and ffmpeg on PATH. Re-running is deterministic.
Usage: python3 scripts/build-heart-sound-library.py [--cache /tmp/hsdata]
"""
import argparse, csv, hashlib, io, json, os, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(ROOT, 'apps', 'web', 'public', 'signs', 'audio')
MANIFEST = os.path.join(ROOT, 'packages', 'shared', 'src', 'signs', 'manifest.json')

PN16 = 'https://physionet.org/files/challenge-2016/1.0.0'
CIRCOR = 'https://physionet.org/files/circor-heart-sound/1.0.3'
STATUS = 'Real recording, open dataset; labels from dataset, pending clinician review'

SOURCES = {
    'physionet-2016': {
        'name': 'PhysioNet/Computing in Cardiology Challenge 2016 (training-c)',
        'url': 'https://physionet.org/content/challenge-2016/1.0.0/',
        'licence': 'ODC-By-1.0',
        'attribution': ('Clifford GD et al. Classification of Normal/Abnormal Heart Sound Recordings: '
                        'the PhysioNet/Computing in Cardiology Challenge 2016. Computing in Cardiology 2016;43:609-612. '
                        'Data from PhysioNet (Goldberger AL et al., Circulation 2000;101(23):e215-e220), '
                        'licensed under the Open Data Commons Attribution License v1.0.'),
    },
    'circor-2022': {
        'name': 'The CirCor DigiScope Phonocardiogram Dataset v1.0.3',
        'url': 'https://physionet.org/content/circor-heart-sound/1.0.3/',
        'licence': 'ODC-By-1.0',
        'attribution': ('Oliveira J, Renna F, Costa P, Nogueira M, Oliveira AC, Elola A, Ferreira C, Jorge A, '
                        'Bahrami Rad A, Reyna M, Sameni R, Clifford G, Coimbra M. The CirCor DigiScope Phonocardiogram '
                        'Dataset (version 1.0.3). PhysioNet (2022), https://doi.org/10.13026/tshs-mw03. Also: Oliveira J et al., '
                        'IEEE JBHI 2022;26(6):2524-2535. Licensed under the Open Data Commons Attribution License v1.0.'),
    },
}

LOCATION_NAMES = {'AV': 'Aortic area', 'PV': 'Pulmonary area', 'TV': 'Tricuspid area', 'MV': 'Mitral area (apex)', 'Phc': 'Other'}
PN_DIAGNOSIS = {'AS': 'aortic-stenosis', 'MR': 'mitral-regurgitation', 'Controls': 'normal'}
SYS_TIMING = {'Early-systolic': 'early-systolic', 'Mid-systolic': 'mid-systolic', 'Late-systolic': 'late-systolic', 'Holosystolic': 'holosystolic'}
SHAPE = {'Crescendo': 'crescendo', 'Decrescendo': 'decrescendo', 'Diamond': 'diamond', 'Plateau': 'plateau'}
GRADE = {'I/VI': 1, 'II/VI': 2, 'III/VI': 3}


def fetch(url, cache):
    path = os.path.join(cache, url.replace('https://', '').replace('/', '_'))
    if not os.path.exists(path):
        print('  fetching', url, file=sys.stderr)
        with urllib.request.urlopen(url, timeout=120) as r, open(path + '.part', 'wb') as f:
            f.write(r.read())
        os.replace(path + '.part', path)
    return path


def encode(src, dest):
    """Skip up to 2 s of handling noise, keep 12 s, band-limit 20 Hz-1 kHz, loudness-normalise, mono 16 kHz MP3."""
    total = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src],
                                 check=True, capture_output=True, text=True).stdout.strip())
    start = min(2.0, max(0.0, total - 12.0))  # short recordings keep their opening seconds instead
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{start:.2f}', '-t', '12', '-i', src,
                    '-af', 'highpass=f=20,lowpass=f=1000,loudnorm=I=-20:TP=-2:LRA=11',
                    '-ac', '1', '-ar', '16000', '-codec:a', 'libmp3lame', '-b:a', '48k', '-map_metadata', '-1', dest], check=True)
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest],
                         check=True, capture_output=True, text=True).stdout.strip()
    return round(float(out), 1)


def physionet_clips(cache):
    appendix = list(csv.DictReader(io.open(fetch(f'{PN16}/annotations/Online_Appendix_training_set.csv', cache), encoding='latin-1')))
    sqi = {r[0]: r for r in csv.reader(open(fetch(f'{PN16}/annotations/updated/training-c/REFERENCE_withSQI.csv', cache)))}
    quota = {'AS': 6, 'MR': 6, 'Controls': 4}
    picked, subjects = [], set()
    for row in sorted(appendix, key=lambda r: r['Challenge record name']):
        rec, diag = row['Challenge record name'], row['Diagnosis'].strip()
        if row['Database'] != 'training-c' or quota.get(diag, 0) == 0:
            continue
        ref = sqi.get(rec)
        if not ref or ref[2] != '1':  # only recordings rated usable for classification
            continue
        if int(row['# Beat (automated algorithm)'] or 0) < 14:  # need enough beats for a 12 s clip
            continue
        subject = row['Original record name'].strip()
        if subject in subjects:  # at most one recording per patient
            continue
        subjects.add(subject)
        quota[diag] -= 1
        picked.append({
            'source': 'physionet-2016', 'recordId': rec, 'subjectId': subject, 'file': f'{PN16}/training-c/{rec}.wav',
            'labels': {'heartSounds': 'abnormal' if ref[1] == '1' else 'normal', 'diagnosis': PN_DIAGNOSIS[diag]},
            'context': {'population': 'adult', 'site': None},
        })
    return picked


def circor_clips(cache):
    rows = list(csv.DictReader(open(fetch(f'{CIRCOR}/training_data.csv', cache))))
    rows.sort(key=lambda r: int(r['Patient ID']))
    # prefer older children/adolescents (closer to adult PACES patients)
    age_rank = {'Adolescent': 0, 'Child': 1}
    rows = [r for r in rows if r['Age'] in age_rank]
    rows.sort(key=lambda r: (age_rank[r['Age']], int(r['Patient ID'])))
    buckets = [
        ('diastolic', 2, lambda r: r['Murmur'] == 'Present' and r['Diastolic murmur timing'] != 'nan'),
        ('holo-loud', 3, lambda r: r['Murmur'] == 'Present' and r['Systolic murmur timing'] == 'Holosystolic' and r['Systolic murmur grading'] == 'III/VI' and r['Diastolic murmur timing'] == 'nan'),
        ('holo-soft', 2, lambda r: r['Murmur'] == 'Present' and r['Systolic murmur timing'] == 'Holosystolic' and r['Systolic murmur grading'] in ('I/VI', 'II/VI') and r['Diastolic murmur timing'] == 'nan'),
        ('early', 2, lambda r: r['Murmur'] == 'Present' and r['Systolic murmur timing'] == 'Early-systolic' and r['Diastolic murmur timing'] == 'nan'),
        ('mid', 2, lambda r: r['Murmur'] == 'Present' and r['Systolic murmur timing'] == 'Mid-systolic' and r['Diastolic murmur timing'] == 'nan'),
        ('absent', 5, lambda r: r['Murmur'] == 'Absent'),
    ]
    absent_sites = ['MV', 'AV', 'PV', 'TV', 'MV']
    used, picked = set(), []
    for name, n, pred in buckets:
        for r in rows:
            if n == 0:
                break
            pid = r['Patient ID']
            if pid in used or not pred(r):
                continue
            locs = r['Recording locations:'].split('+')
            if r['Murmur'] == 'Present':
                site = r['Most audible location']
                if site == 'nan' or locs.count(site) != 1:
                    continue
            else:
                site = absent_sites[5 - n]
                if locs.count(site) != 1:
                    continue
            used.add(pid); n -= 1
            labels = {'murmur': 'present' if r['Murmur'] == 'Present' else 'absent'}
            if r['Murmur'] == 'Present':
                if r['Systolic murmur timing'] != 'nan':
                    labels['systolicMurmur'] = 'present'
                    labels['systolicTiming'] = SYS_TIMING[r['Systolic murmur timing']]
                    if r['Systolic murmur shape'] in SHAPE: labels['systolicShape'] = SHAPE[r['Systolic murmur shape']]
                    if r['Systolic murmur grading'] in GRADE: labels['systolicGrade'] = GRADE[r['Systolic murmur grading']]
                else:
                    labels['systolicMurmur'] = 'absent'
                labels['diastolicMurmur'] = 'present' if r['Diastolic murmur timing'] != 'nan' else 'absent'
            picked.append({
                'source': 'circor-2022', 'recordId': f'{pid}_{site}', 'subjectId': pid, 'file': f'{CIRCOR}/training_data/{pid}_{site}.wav',
                'labels': labels,
                'context': {'population': 'paediatric', 'ageGroup': r['Age'].lower(), 'site': site, 'siteName': LOCATION_NAMES[site]},
            })
    return picked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default='/tmp/hsdata')
    args = ap.parse_args()
    os.makedirs(args.cache, exist_ok=True)
    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    for name in os.listdir(AUDIO_DIR):  # no stale clips from a previous, larger build
        if name.endswith('.mp3'):
            os.remove(os.path.join(AUDIO_DIR, name))
    clips, seen_keys, seen_hashes = [], set(), set()
    for c in physionet_clips(args.cache) + circor_clips(args.cache):
        # Never ship the same source recording twice: unique (dataset, record, file), one clip per
        # patient per dataset, and unique source audio bytes. Ship fewer clips rather than duplicates.
        src_path = fetch(c['file'], args.cache)
        digest = hashlib.sha256(open(src_path, 'rb').read()).hexdigest()
        keys = {(c['source'], 'record', c['recordId']), (c['source'], 'file', c['file']), (c['source'], 'subject', c['subjectId'])}
        if keys & seen_keys or digest in seen_hashes:
            print('  skipping duplicate recording', c['file'], file=sys.stderr)
            continue
        seen_keys |= keys; seen_hashes.add(digest)
        cid = f'hs-{len(clips) + 1:02d}'
        duration = encode(src_path, os.path.join(AUDIO_DIR, f'{cid}.mp3'))
        src = SOURCES[c['source']]
        clips.append({
            'id': cid, 'audio': f'/signs/audio/{cid}.mp3', 'durationSec': duration,
            'source': c['source'], 'sourceName': src['name'], 'sourceUrl': src['url'], 'recordId': c['recordId'],
            'subjectId': c['subjectId'], 'sourceSha256': digest, 'originalFile': c['file'].rsplit('/', 1)[1], 'licence': src['licence'], 'attribution': src['attribution'],
            'status': STATUS, 'context': c['context'], 'labels': c['labels'],
        })
    manifest = {'version': 1, 'generatedBy': 'scripts/build-heart-sound-library.py', 'sources': SOURCES, 'clips': clips}
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2); f.write('\n')
    print(f'Wrote {len(clips)} clips to {AUDIO_DIR} and manifest to {MANIFEST}')


if __name__ == '__main__':
    main()
