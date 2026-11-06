import torch
import transformers as tf
import minicons
from minicons import cwe
import csv
import numpy as np


model = cwe.CWE('bert-base-uncased', device = 'cpu')

with open('asl_content.txt', 'r', encoding = 'utf-8') as f1:
    asl_content = f1.read()
with open('segmented_asl_content.txt', 'r', encoding = 'utf-8') as f2:
    segmented_asl_content = f2.read()

asl_content = asl_content.split(',')
for word_index,word in enumerate(asl_content):
    asl_content[word_index] = word.strip()
segmented_asl_content = segmented_asl_content.split(',')
for word_index,word in enumerate(segmented_asl_content):
    segmented_asl_content[word_index] = word.strip()

asl_content_zip = list(zip(asl_content, asl_content))
segmented_asl_content_zip = list(zip(segmented_asl_content, segmented_asl_content))

with open('bert_representations.txt', 'w', encoding = 'utf-8') as file:
    for rep in asl_content_zip:
        asl_embeddings = model.extract_representation(rep)
        asl_embeddings = np.array2string(asl_embeddings[0].numpy(), separator = ' ')
        asl_embeddings = asl_embeddings.replace('\n', ' ')
        file.write('"' + rep[0] + '" ' + asl_embeddings[1:-1] + '\n')
with open('segmented_bert_representations.txt', 'w', encoding = 'utf-8') as file:
    for rep in segmented_asl_content_zip:
        try:
            if rep[0] != '':
                segmented_asl_embeddings = model.extract_representation(rep)
        except:
            print(rep)
            raise
        if type(segmented_asl_embeddings) != str:
            segmented_asl_embeddings = np.array2string(segmented_asl_embeddings[0].numpy(), separator = ' ')
        segmented_asl_embeddings = segmented_asl_embeddings.replace('\n', ' ')
        file.write('"' + rep[0] + '" ' + segmented_asl_embeddings[1:-1] + '\n')