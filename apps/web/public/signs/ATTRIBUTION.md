# Heart-sound clips: attribution and licence

Every file in `audio/` is a **real recording from an open dataset**, trimmed to about 12 seconds,
band-limited (20 Hz–1 kHz), loudness-normalised and re-encoded as mono MP3 by
`scripts/build-heart-sound-library.py`. No audio is synthetic. Labels are copied from each dataset's
own metadata and are **pending clinician review**. Per-clip provenance (dataset, original record and
file, labels) is in `packages/shared/src/signs/manifest.json`.

Both datasets are published on PhysioNet under the **Open Data Commons Attribution License v1.0**
(https://opendatacommons.org/licenses/by/1-0/), which permits commercial use provided the source is
attributed. Changes made here: trimming, filtering, loudness normalisation and format conversion.

## PhysioNet/Computing in Cardiology Challenge 2016 (training-c subset)
https://physionet.org/content/challenge-2016/1.0.0/ — adults with aortic stenosis, mitral regurgitation, and controls.

- Clifford GD, Liu C, Moody B, Springer D, Silva I, Li Q, Mark RG. Classification of Normal/Abnormal Heart Sound
  Recordings: the PhysioNet/Computing in Cardiology Challenge 2016. Computing in Cardiology 2016;43:609-612.
- Liu C et al. An open access database for the evaluation of heart sound algorithms. Physiol Meas 2016;37(12):2181-2213.
- Goldberger AL et al. PhysioBank, PhysioToolkit, and PhysioNet. Circulation 2000;101(23):e215-e220.

## The CirCor DigiScope Phonocardiogram Dataset v1.0.3 (paediatric)
https://physionet.org/content/circor-heart-sound/1.0.3/ — https://doi.org/10.13026/tshs-mw03

- Oliveira J, Renna F, Costa P, Nogueira M, Oliveira AC, Elola A, Ferreira C, Jorge A, Bahrami Rad A, Reyna M,
  Sameni R, Clifford G, Coimbra M. The CirCor DigiScope Phonocardiogram Dataset (version 1.0.3). PhysioNet, 2022.
- Oliveira J et al. The CirCor DigiScope Dataset: From Murmur Detection to Murmur Classification.
  IEEE J Biomed Health Inform 2022;26(6):2524-2535.
- Goldberger AL et al. PhysioBank, PhysioToolkit, and PhysioNet. Circulation 2000;101(23):e215-e220.

## Not used
The ICBHI 2017 respiratory sound database is **not** used: its licence is research-only.
