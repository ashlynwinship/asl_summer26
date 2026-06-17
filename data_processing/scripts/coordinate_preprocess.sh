#!/bin/bash
#SBATCH -J coordinate_preprocess                                               # Job name
#SBATCH -o /share/compling/data/semlex/logs/coordinate_preprocess_%j.out       # output file (%j expands to jobID)
#SBATCH -e /share/compling/data/semlex/logs/coordinate_preprocess_%j.err       # error log file (%j expands to jobID)
#SBATCH -N 1                                                                   # Total number of nodes requested
#SBATCH -n 4                                                                   # Total number of cores requested
#SBATCH --cpus-per-task=1                                                      # Total number of cores requested per task
#SBATCH --get-user-env                                                         # retrieve the users login environment
#SBATCH --mem=2000                                                             # server memory requested in MB (per node)
#SBATCH -t 12:00:00                                                            # Time limit (hh:mm:ss)
#SBATCH --partition=default_partition                                          # Request partition
#SBATCH --gres=gpu:nvidia_rtx_6000_ada_generation:1                            # Type:number of GPUs needed

conda activate asl-dict

SEMLEX_DIR=/share/compling/data/semlex

time python /share/compling/data/semlex/scripts/coordinates_preprocess.py --split train --limit 600
