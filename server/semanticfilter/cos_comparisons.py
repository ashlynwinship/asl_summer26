import pandas as pd
import numpy as np
import re
import torch
import transformers as tf
import minicons
from minicons import cwe


model = cwe.CWE('bert-base-uncased', device = 'cpu')

def GetBert(instring):
    reps = model.extract_representation([[instring, instring]])
    return(np.array(reps))

with open('bert_representations.txt', 'r', encoding = 'utf-8') as f1:
    bert_reps = f1.read()
with open('segmented_bert_representations.txt', 'r', encoding = 'utf-8') as f2:
    seg_bert_reps = f2.read()

bert_reps = re.sub(r' +', ' ', bert_reps)
seg_bert_reps = re.sub(r' +', ' ', seg_bert_reps)

bert_reps = bert_reps.split('\n')
seg_bert_reps = seg_bert_reps.split('\n')

words = []
vecs = []

for line in bert_reps:
    sline = line.strip(' ').split(' ')
    vecs.append(sline[-768:])
    words.append(sline[0:-768])
for line in seg_bert_reps:
    if line not in bert_reps:
        sline = line.strip(' ').split(' ')
        vecs.append(sline[-768:])
        words.append(sline[0:-768])
words = [' '.join(w) for w in words]
refs = np.array(vecs)
refs = refs.astype(np.float32)
ref_norms = np.linalg.norm(refs,axis=1)
#index = words.index('"vehicle"')
query = np.array(GetBert('word')).flatten()
best = (np.argpartition(np.dot(refs,query)/ref_norms/np.linalg.norm(query),-5)[-5:])
print([words[b] for b in best])