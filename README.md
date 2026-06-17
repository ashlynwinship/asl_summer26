# ASL Summer 2026 Project (final name TBD)


### Summary of Project
Lorem ispum (write later)


### Tech Stack
- `Python` 3.10.20
- `Anaconda` (for conda envs)
- `Mediapipe 0.10.21`
- `pandas`
- `numpy`
- `opencv`
- `lshashpy3`
- `rich` (for progress bars)
- `pip`(to install mediapipe & rich)
- `Git LFS` (for large file storage; https://git-lfs.com/)


### How to Run Scripts
- `lsh_preprocess_script.py` via terminal and without warning messages from mediapipe: 
    - `python data_processing/scripts/lsh_preprocess_script.py 2>data_processing/mediapipe_warnings.log` (will redirect the logging to a separate .txt file for as-needed debugging)
- `python data_processing/scripts/preprocess_script.py 2>data_processing/mediapipe_warnings.log --limit #` (for hand & pose coordinate processing - replace # with the number of videos you want to process. )


### Old Notes
In data_processing, I provided notebooks for getting the MediaPipe data out of citation-form videos (preprocessing_for_LSH.ipynb), and for running Locality-Sensitive Hashing (LSH) to determine the similarity of a test sign (frame2frame and vid2vid).
The vid2vid notebook compares whole videos to find a match, while frame2frame compares separate frames (we try a few different approaches, but still need to settle on a definitive keyframe selection strategy). You will see that the vid2vid approach is pretty bad!
I also provided a test sign (chocolate-me.mov), as well as a handful of citation forms from Bill Vicars (asl_citation_forms folder). 
You can use these notebooks and the test data to play around with LSH analysis locally; the full analysis will have to be run on the Unicorn cluster.

